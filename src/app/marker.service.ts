import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import * as L from 'leaflet';
import 'leaflet.markercluster'
import { PopUpService } from './popup.service';


@Injectable({
  providedIn: 'root'
})
export class MarkerService {
  markersClusters: any;
  headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  apiURL = 'http://192.168.100.81:8000/'

  
  constructor(private http: HttpClient, private popupService: PopUpService) {
    this.markersClusters = L.markerClusterGroup();
  }

  static scaledRadius(val: number, maxVal: number): number {
    return 20 * (val / maxVal);
  }



   makeUnidadesMarkers(): any {

    return this.http.post(`${this.apiURL}unidades/obter_unidades`, '', { headers: this.headers })

  }
 

// makeclientsMarkers(bounds, tipoCliente, infoExtras, download, contagem  ) {

//  let params = new HttpParams().set('tipo_cliente' , tipoCliente ).set('retornar_informacoes_extras',infoExtras ).set('download', download).set('obter_somente_contagem', contagem)
//  return this.http.post(`${this.apiURL}clientes/obter_clientes`, bounds,{headers: this.headers, params})

// }}

makeclientsMarkers(bounds, tipoCliente, infoExtras, download, contagem): Promise<any> {
  return new Promise(resolve => {
    let params = new HttpParams().set('tipo_cliente' , tipoCliente ).set('retornar_informacoes_extras',infoExtras ).set('download', download).set('obter_somente_contagem', contagem)
    this.http.post(`${this.apiURL}clientes/obter_clientes`, bounds,{headers: this.headers, params}).subscribe(result => {
      resolve(result);
    }, error => {
      resolve(error);
    });
  });
 }}
