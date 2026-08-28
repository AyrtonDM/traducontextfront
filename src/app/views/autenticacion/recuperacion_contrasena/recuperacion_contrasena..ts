import { ChangeDetectorRef, Component, ElementRef, OnDestroy, QueryList, ViewChildren, inject } from '@angular/core';
import {
	AbstractControl,
	FormBuilder,
	ReactiveFormsModule,
	ValidationErrors,
	Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AutenticacionService } from '../../../core/services/autenticacion.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
	const password = control.get('newPassword')?.value;
	const confirmation = control.get('confirmPassword')?.value;
	return password && confirmation && password !== confirmation ? { passwordsMismatch: true } : null;
}

@Component({
	selector: 'app-recuperacion-contrasena',
	standalone: true,
	imports: [ReactiveFormsModule, RouterLink],
	templateUrl: './recuperacion_contrasena..html',
	styleUrl: './recuperacion_contrasena.css',
})
export class RecuperacionContrasena implements OnDestroy {
	private readonly fb = inject(FormBuilder);
	private readonly authService = inject(AutenticacionService);
	private readonly router = inject(Router);
	private readonly changeDetector = inject(ChangeDetectorRef);

	@ViewChildren('codeInput') private readonly codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

	currentStep: 1 | 2 | 3 = 1;
	isLoading = false;
	codeValidationInProgress = false;
	backendError = '';
	successMessage = '';
	showNewPassword = false;
	showConfirmPassword = false;
	countdown = 0;
	private countdownTimer?: ReturnType<typeof setInterval>;

	readonly accountForm = this.fb.nonNullable.group({
		email: ['', [Validators.required, Validators.email]],
	});

	readonly codeForm = this.fb.nonNullable.group({
		code: this.fb.nonNullable.array(
			Array.from({ length: 6 }, () => this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d$/)])),
		),
	});

	readonly passwordForm = this.fb.nonNullable.group(
		{
			newPassword: ['', [Validators.required, Validators.minLength(8)]],
			confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
		},
		{ validators: passwordsMatchValidator },
	);

	get emailControl() { return this.accountForm.controls.email; }
	get codeControls() { return this.codeForm.controls.code.controls; }
	get newPasswordControl() { return this.passwordForm.controls.newPassword; }
	get confirmPasswordControl() { return this.passwordForm.controls.confirmPassword; }
	get verificationCode(): string { return this.codeControls.map((control) => control.value).join(''); }
	get formattedCountdown(): string { return `00:${this.countdown.toString().padStart(2, '0')}`; }
	get hasEmailError(): boolean { return this.emailControl.invalid && (this.emailControl.touched || this.emailControl.dirty); }
	get hasPasswordMismatch(): boolean { return this.passwordForm.hasError('passwordsMismatch') && this.confirmPasswordControl.touched; }

	submitEmail(): void {
		if (this.accountForm.invalid || this.isLoading) {
			this.accountForm.markAllAsTouched();
			return;
		}

		this.currentStep = 2;
		this.isLoading = false;
		this.backendError = '';
		this.startCountdown();
		this.changeDetector.detectChanges();
		setTimeout(() => this.focusCodeInput(0));
		this.authService.solicitarRecuperacion(this.emailControl.value).pipe(timeout(20000)).subscribe({
			next: () => undefined,
			error: (error) => this.handleError(error, 'No pudimos enviar el código. Revisa tu correo e inténtalo de nuevo.'),
		});
	}

	onCodeInput(index: number, event: Event): void {
		const input = event.target as HTMLInputElement;
		const digit = input.value.replace(/\D/g, '').slice(-1);
		this.codeControls[index].setValue(digit);
		input.value = digit;
		if (digit && index < this.codeControls.length - 1) this.focusCodeInput(index + 1);
		if (this.verificationCode.length === 6) this.validateRecoveryCode();
	}

	onCodeKeydown(index: number, event: KeyboardEvent): void {
		if (event.key === 'Backspace' && !this.codeControls[index].value && index > 0) this.focusCodeInput(index - 1);
	}

	onCodePaste(event: ClipboardEvent): void {
		event.preventDefault();
		const pastedCode = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
		pastedCode.split('').forEach((digit, index) => this.codeControls[index].setValue(digit));
		if (pastedCode.length === 6) this.validateRecoveryCode();
		else this.focusCodeInput(pastedCode.length);
	}

	private validateRecoveryCode(): void {
		if (this.codeValidationInProgress) return;
		this.codeValidationInProgress = true;
		this.backendError = '';
		this.authService.validarCodigoRecuperacion(this.emailControl.value, this.verificationCode).pipe(
			finalize(() => this.codeValidationInProgress = false),
		).subscribe({
			next: () => {
				this.codeForm.markAllAsTouched();
				this.currentStep = 3;
			},
			error: (error) => {
				this.isLoading = false;
				this.backendError = error.status === 400
					? 'El código es incorrecto o ha expirado.'
					: 'No se pudo validar el código. Inténtalo de nuevo.';
			},
		});
	}

	resendCode(): void {
		if (this.countdown > 0 || this.isLoading) return;
		this.isLoading = true;
		this.backendError = '';
		this.startCountdown();
		this.authService.solicitarRecuperacion(this.emailControl.value).pipe(
			timeout(20000),
			finalize(() => this.isLoading = false),
		).subscribe({
			next: () => undefined,
			error: (error) => this.handleError(error, 'No pudimos reenviar el código.'),
		});
	}

	submitPassword(): void {
		if (this.passwordForm.invalid || this.verificationCode.length !== 6 || this.isLoading) {
			this.passwordForm.markAllAsTouched();
			return;
		}
		this.isLoading = true;
		this.backendError = '';
		const { newPassword } = this.passwordForm.getRawValue();
		this.authService.restablecerContrasena(this.emailControl.value, this.verificationCode, newPassword).pipe(
			finalize(() => this.isLoading = false),
		).subscribe({
			next: () => {
				this.successMessage = 'Tu contraseña se restableció correctamente.';
				this.stopCountdown();
				setTimeout(() => this.router.navigate(['/login']), 1200);
			},
			error: (error) => this.handleError(error, 'El código no es válido o ha expirado.'),
		});
	}

	toggleNewPassword(): void { this.showNewPassword = !this.showNewPassword; }
	toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }

	ngOnDestroy(): void { this.stopCountdown(); }

	private focusCodeInput(index: number): void { this.codeInputs?.get(index)?.nativeElement.focus(); }

	private startCountdown(): void {
		this.stopCountdown();
		this.countdown = 45;
		this.countdownTimer = setInterval(() => {
			this.countdown -= 1;
			if (this.countdown <= 0) this.stopCountdown();
		}, 1000);
	}

	private stopCountdown(): void {
		if (this.countdownTimer) {
			clearInterval(this.countdownTimer);
			this.countdownTimer = undefined;
		}
	}

	private handleError(error: { error?: { detail?: string } }, fallback: string): void {
		this.isLoading = false;
		this.backendError = error.error?.detail || fallback;
	}
}
