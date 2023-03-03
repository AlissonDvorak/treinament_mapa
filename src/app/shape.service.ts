import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ShapeService {
  constructor(private http: HttpClient) { }

  headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  apiURL = 'http://localhost:8000/'

  getStateShapes() {
    
    return this.http.post(`${this.apiURL}setores/obter_setores`, '{"bottomLeft":{"lat":-9.671370, "lng":-35.787824},"topRight":{"lat":-9.645309,"lng": -35.700146}}', { headers: this.headers })

    

  }

  
}

