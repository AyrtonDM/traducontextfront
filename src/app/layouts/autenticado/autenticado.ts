import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-autenticado',
  standalone: true,
  imports: [RouterOutlet, Header],
  templateUrl: './autenticado.html',
  styleUrl: './autenticado.css',
})
export class Autenticado {

}