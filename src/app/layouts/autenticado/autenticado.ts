import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../components/header/header';
import { Sidebar } from '../../components/sidebar/sidebar';
import { AsistenteGuia } from '../../components/asistente-guia/asistente-guia';

@Component({
  selector: 'app-autenticado',
  standalone: true,
  imports: [RouterOutlet, Header, Sidebar, AsistenteGuia],
  templateUrl: './autenticado.html',
  styleUrl: './autenticado.css',
})
export class Autenticado {

}