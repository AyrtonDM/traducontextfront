import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../components/header/header';
import { Sidebar } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-autenticado',
  standalone: true,
  imports: [RouterOutlet, Header, Sidebar],
  templateUrl: './autenticado.html',
  styleUrl: './autenticado.css',
})
export class Autenticado {

}