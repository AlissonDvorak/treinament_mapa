import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ShapeService {
  constructor(private http: HttpClient) { }

  headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  apiURL = 'http://192.168.100.81:8000/'

  getStateShapes(bounds): any {
    return this.http.post(`${this.apiURL}setores/obter_setores`, bounds, { headers: this.headers })
    }}
