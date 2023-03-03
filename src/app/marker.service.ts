import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  apiURL = 'http://localhost:8000/'

  constructor(private http: HttpClient, private popupService: PopUpService) {
    this.markersClusters = L.markerClusterGroup();
  }

  static scaledRadius(val: number, maxVal: number): number {
    return 20 * (val / maxVal);
  }

  makecircleMarkers(map: L.Map): void {

    var circle = L.circle([-9.659897, -35.722694], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: 500
  }).addTo(map).bindPopup("circulo");

  }
 
makePolygonMarkers(map: L.Map): void {

  var polygon = L.polygon([
    [-9.655737, -35.701546],
    [-9.661721, -35.714170],
    [-9.651071, -35.716233]
]).addTo(map).bindPopup(`Poligono`);

}
  makeUnidadesMarkers(map: L.Map): any {

    var sebraeIcon = L.icon({
      iconUrl: './assets/data/marcador.png',
      iconSize: [50, 60],
      iconAnchor: [22, 94],
      shadowAnchor: [4, 62],
      popupAnchor: [-3, -76],
      
    });

    this.http.post(`${this.apiURL}unidades/obter_unidades`, '', { headers: this.headers })
      .subscribe(UnidadeSebrae => {
        
        for (const geoloc in UnidadeSebrae) {
        
          const lon = UnidadeSebrae[geoloc].LOCATION.coordinates[0];
          const lat = UnidadeSebrae[geoloc].LOCATION.coordinates[1];
          const marker = L.marker([lat, lon], { icon: sebraeIcon });
          const name  = UnidadeSebrae[geoloc]['Nome da Unidade']
          marker.addTo(map).bindPopup(`${name}`);
        }
      })
  }

  makeclientsMarkers(map: L.Map): void {
    // this.http.post(`${this.apiURL}clientes/obter_clientes?tipo_cliente=PJ&retornar_informacoes_extras=true&download=false`, '{"map_bounds_retangulo":{"bottomLeft":{"lat":-9.978390,"lng":-38.425236},"topRight":{"lat":-8.919070,"lng":-35.159656}}}', { headers: this.headers })
      this.http.post(`${this.apiURL}clientes/obter_clientes?tipo_cliente=PJ&retornar_informacoes_extras=true&download=false`, '{"map_bounds_retangulo":{"bottomLeft":{"lat":-9.671370, "lng":-35.787824},"topRight":{"lat":-9.645309,"lng": -35.700146}}}', { headers: this.headers })
      .subscribe(clientesSebrae => {
        for (var i = 0; i < clientesSebrae['CLIENTES'].length; i++) {
          const lon = clientesSebrae['CLIENTES'][i].LOCATION.coordinates[0];
          const lat = clientesSebrae['CLIENTES'][i].LOCATION.coordinates[1];
          const marker = L.marker([lat, lon]);

          this.markersClusters.addLayer(marker).bindPopup(
            `Código: <b>${clientesSebrae['CLIENTES'][i]["CODPARCEIRO"]}</b>
             <br>Renda Media: <b>${clientesSebrae['CLIENTES'][i]["RENDA_NOMINAL_MEDIA"]}</b>
            `
          );
          this.markersClusters.addTo(map);
        }
      }
      )
  }
}