import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { MarkerService } from '../marker.service';
import { ShapeService } from '../shape.service';
import { MiniMap } from "leaflet-control-mini-map";
import "leaflet-draw";
import { SearchControl, EsriProvider } from "leaflet-geosearch";

const provider = new EsriProvider();

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';


let openStreet = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function getColor(d) {
  return d > 10000 ? '#024a0b' :
    d > 5000 ? '#8ddf12' :
      d > 2000 ? '#feb24c' :
        d > 1000 ? '#fd8d3c' :
          d > 500 ? '#f03b20' :
            '	#bd0026';

}

const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})

export class MapComponent implements AfterViewInit {
  private map: L.Map = {} as L.Map;
  private setoresIbge;
  search: any = undefined;


  private initMap(): void {
    this.map = L.map('map', {
      center: [-9.66625, -35.7351],
      zoom: 14
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    tiles.addTo(this.map);

    var minimap = new L.TileLayer(openStreet, {
      minZoom: 0,
      maxZoom: 10,
    });
    var miniMap = new MiniMap(minimap).addTo(this.map);

    let search = SearchControl({
      style: "bar",
      provider: provider,
    }); search.addTo(this.map);


    var drawnItems = new L.FeatureGroup();
    this.map.addLayer(drawnItems);
    var drawControl = new L.Control.Draw({

      draw: {
        marker: undefined,
        circlemarker: undefined,
        polyline: undefined,
        rectangle: undefined,

      },
    });

    this.map.addControl(drawControl);
    this.map.on('draw:created', function (draw: any) {
      console.log(draw)
      // verificar tipo poligono ou circulo
    })
    var legend = new L.Control({ position: 'bottomright' });

    legend.onAdd = function (map) {

      var div = L.DomUtil.create('div', 'info legend'),
        grades = [0, 500, 1000, 2000, 5000, 10000],
        labels = [];

      // loop through our density intervals and generate a label with a colored square for each interval
      div.innerHTML += "<h3><b>  Renda</b></h3>"
      for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
          '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
          grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
      }
      return div;
    };

    legend.addTo(this.map);


  }



  constructor(private markerService: MarkerService, private shapeService: ShapeService) { }



  private highlightFeature(e) {
    const layer = e.target;

    layer.setStyle({
      weight: 10,
      opacity: 1.0,
      color: '#12df20',
      fillOpacity: 1.0,
    });
  }

  private resetFeature(e) {


    const layer = e.target;


    layer.setStyle({
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    });
  }

  private initStatesLayer() {


    const stateLayer = L.geoJSON(this.setoresIbge, {
      style: () => ({
        fillColor: getColor(this.setoresIbge[0]['properties']['desidade']),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
      }),

      onEachFeature: (feature, layer) => (
        layer.on({
          mouseover: (e) => (this.highlightFeature(e)),
          mouseout: (e) => (this.resetFeature(e)),
        })
      )
    });

    this.map.addLayer(stateLayer);
    stateLayer.bringToBack();
  }



  ngAfterViewInit(): void {
    let cont = 0

    this.initMap();
    this.markerService.makeUnidadesMarkers(this.map)
    this.markerService.makeclientsMarkers(this.map);
    this.shapeService.getStateShapes().subscribe(setoresIbge => {
      for (var i = 0; i < setoresIbge['SETORES'].length; i++) {

        cont++

        var dados = [{
          type: "Feature",
          id: cont,
          properties: {
            name: setoresIbge['SETORES'][i]['Nome_do_bairro'],
            desidade: setoresIbge['SETORES'][i]['V009']
          },
          geometry: {
            type: "Polygon",
            coordinates: setoresIbge['SETORES'][i]['geometry']['coordinates'],
          }
        }]

        this.setoresIbge = dados;
        this.initStatesLayer();
      }
    });

  }
}
