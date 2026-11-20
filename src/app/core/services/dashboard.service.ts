import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardRespuesta, FiltroDashboard } from '../models/dashboard.model';

/** Dashboard administrativo (HU-46). Requiere el permiso ver_dashboard. */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  /** Endpoint: GET /api/v1/dashboard?fecha_desde=AAAA-MM-DD&fecha_hasta=AAAA-MM-DD&zona_horaria=America/La_Paz */
  obtener(filtro: FiltroDashboard): Observable<DashboardRespuesta> {
    let params = new HttpParams().set('zona_horaria', filtro.zona_horaria);
    if (filtro.fecha_desde) {
      params = params.set('fecha_desde', filtro.fecha_desde);
    }
    if (filtro.fecha_hasta) {
      params = params.set('fecha_hasta', filtro.fecha_hasta);
    }
    return this.http.get<DashboardRespuesta>(this.apiUrl, { params });
  }
}
