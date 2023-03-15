import { Component, AfterViewInit, ComponentFactoryResolver } from '@angular/core';
import * as L from 'leaflet';
import { MarkerService, } from '../marker.service';
import { ShapeService } from '../shape.service';
import { MiniMap } from "leaflet-control-mini-map";
import "leaflet-draw";
import { SearchControl, EsriProvider } from "leaflet-geosearch";
import { MatDialog } from '@angular/material/dialog';
import 'leaflet.control.opacity';
import 'leaflet-dialog';
import { DialogComponent } from '../dialog/dialog.component';
import * as turf from '@turf/turf';
import 'leaflet-range';


// variaveis iniciais
const provider = new EsriProvider();
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
let openStreet = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const setoresGroup = L.layerGroup();
const clienteGroup = L.layerGroup();
const _this = this
var minimo = Infinity
var maximo = - Infinity
let legendControl;



// define palheta de cores
function getColor(d) {
  return d > 10000 ? '#024a0b' :
    d > 5000 ? '#8ddf12' :
      d > 2000 ? '#feb24c' :
        d > 1000 ? '#fd8d3c' :
          d > 500 ? '#f03b20' :
            '	#bd0026';

}


// marcador default 
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
});

L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],


})



export class MapComponent implements AfterViewInit {
  sliderValue = 5; // Valor padrão do slider
  isLoading = true;
  private map: L.Map = {} as L.Map;
  private setoresIbge;
  search: any = undefined;
  markersClusters = L.markerClusterGroup()
  basemap: any;
  centroBounds: any;
  geoApiQuery: any
  private northEast: any;
  private southWest: any;
  gruposetores: any;
  setoresLayer: any;
  clientesSebrae: any;
  dados: any;



  private getMapBounds() {
    var bounds = this.map.getBounds();
    this.northEast = bounds.getNorthEast();
    this.southWest = bounds.getSouthWest();
  }



  // inicializar mapa leaftlet
  private initMap(): void {


    this.map = L.map('map', {

      zoomControl: false,
      zoomAnimation: true,
      center: [-9.66625, -35.7351],
      zoom: 15,

    });



    this.basemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    this.basemap.addTo(this.map);
    this.getMapBounds()




    this.map.on('moveend', () => {
      this.map.invalidateSize();
      var center = this.map.getCenter();

      this.getMapBounds()
      let area = (this.northEast.lat - this.southWest.lat) * (this.northEast.lng - this.southWest.lng)


      if (area > 0.0077434690123643285) {
        var center = this.map.getCenter();
        console.log("excedeu o tamanho");

      }

      this.obterSetores(this.northEast, this.southWest);
      this.checkBounds();

    });


    // configs controle de zoom
    L.control.zoom({
      position: 'bottomleft'
    }).addTo(this.map);


    // configs minimapa
    var minimap = new L.TileLayer(openStreet, {
      minZoom: 0,
      maxZoom: 10,
    });
    var miniMap = new MiniMap(minimap).addTo(this.map);


    // configs busca endereco
    const search = SearchControl({
      style: "bar",
      searchLabel: 'Busca por endereço',
      provider: provider,
      autoClose: true,
      retainZoomLevel: true
    }); search.addTo(this.map);


    // configs controle de busca por circulos ou poligonos
    var drawnItems = new L.FeatureGroup();
    this.map.addLayer(drawnItems);
    var drawControl = new L.Control.Draw({
      draw: {
        marker: false,
        circlemarker: false,
        polyline: false,
        rectangle: false
      },
    }).addTo(this.map);
    this.map.addControl(drawControl);


    // logica de  busca por circulos ou poligonos
    this.map.on('draw:created', (draw: any) => {
      const type = draw.layerType;
      const layer = draw.layer;

      if (type === 'circle') {
        this.checkBounds(type, layer);
        this.resumoClientes('circulo')

      } else if (type === 'polygon') {
        this.checkBounds(type, layer);
        // console.log(layer)
        
        this.resumoClientes('poligono')
      }
    });
  }


  // legenda de renda
  legenda() {
    if (legendControl) {
      this.map.removeControl(legendControl);
    }
    legendControl = new L.Control({ position: 'bottomright' });
    legendControl.onAdd = function (map) {
      minimo.toFixed(2)
      maximo.toFixed(2)
      let media = parseInt((minimo + maximo * 0.5).toFixed(2))
      let tresQuarto = parseInt((minimo + maximo * 0.75).toFixed(2))
      let umQuarto = parseInt((minimo + maximo * 0.25).toFixed(2))

      var div = L.DomUtil.create('div', 'info legend'),
        grades = [minimo, umQuarto, media, tresQuarto, maximo];
      div.innerHTML += "<h4><b>Renda</b></h4>"
      for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
          '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
          grades[i] + (grades[i + 1] ? ' &ndash; ' + grades[i + 1] + '<br>' : '+');
      }
      return div;
    };
    legendControl.addTo(this.map);
  }


  // controle de camadas
  camadas() {
    var baseMaps = {
      "OpenStreetMap": this.basemap,
    };
    var overlayMaps = {
      "Unidades Sebrae": this.grupoUnidades,
      "Clientes": this.markersClusters,
      "setores": setoresGroup
    };
    var Map_AddLayer = {
      "setores": setoresGroup
    }
    var opacityControl = L.control.opacity(Map_AddLayer, { position: 'topright' });
    opacityControl.addTo(this.map);
    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(this.map);
  }
  constructor(private dialog: MatDialog, private markerService: MarkerService, private shapeService: ShapeService) { }


  // quando passa o mouse sobre o setor, muda de cor
  private highlightFeature(e) {
    const layer = e.target;

    layer.setStyle({
      weight: 10,
      opacity: 1.0,
      color: '#12df20',
      fillOpacity: 1.0,
    });
  }


  // volta a cor padrao quando tira o mouse de cimaa
  private resetFeature(e) {
    const layer = e.target;
    layer.setStyle({
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.5
    });
  }


  // responsavel pelo texto de clientes
  dialogText(message?, rendaMedia?, type?) {
    setTimeout(() => {

      const dialogRef = this.dialog.open(DialogComponent, {
        width: '260px',
        position: { top: '50px', left: '100px' },
        data: {
          title: `Clientes Sebrae no ${type} `,
          message: message,
          rendaMedia: rendaMedia
        },
      });
    }, 10);
  }

  resumoClientes(type) {
    var rendaMedia: any = [],
      sum = 0;

    
    let nClientes = this.clientesSebrae['CLIENTES'].length

    for (var i = 0; i < nClientes; i++) {
      let m = this.clientesSebrae['CLIENTES'][i]['RENDA_NOMINAL_MEDIA'];
      rendaMedia.push(m)
    }
    for (var i = 0; i < nClientes; i++) {
      sum += rendaMedia[i];
    }

    let media = sum / nClientes

    const rendaMediaFormatada = media.toFixed(2);
    this.dialogText(nClientes, rendaMediaFormatada, type)

  }


  grupoUnidades: any

  makeUnidades() {



    var sebraeIcon = L.icon({
      iconUrl: './assets/data/marcador.png',
      iconSize: [50, 60],
      iconAnchor: [22, 94],
      shadowAnchor: [4, 62],
      popupAnchor: [-3, -76],

    });
    this.markerService.makeUnidadesMarkers().subscribe(UnidadeSebrae => {
      let e: any = []

      for (let geoloc in UnidadeSebrae) {

        let lon = UnidadeSebrae[geoloc].LOCATION.coordinates[0];
        let lat = UnidadeSebrae[geoloc].LOCATION.coordinates[1];
        let marker = L.marker([lat, lon], { icon: sebraeIcon });
        let name = UnidadeSebrae[geoloc]['Nome da Unidade'];
        let m = marker.bindPopup(`${name}`);
        e.push(m)
      }
      this.grupoUnidades = L.layerGroup(e)
      this.grupoUnidades.addTo(this.map)
      this.camadas()
    })

  }


  ngAfterViewInit(): void {

    this.initMap();
    this.makeUnidades()
    this.obterSetores()
    this.checkBounds()

  }

  obterSetores(sw?, ne?) {
    let cont = 0;
    minimo = Infinity
    maximo = -Infinity
    let ArrayCoord: any = []
    let qtdClientes

    this.shapeService.getStateShapes(`{"bottomLeft":{"lat":${sw ? sw.lat : this.southWest.lat}, "lng":${sw ? sw.lng : this.southWest.lng}},
    "topRight":{"lat":${ne ? ne.lat : this.northEast.lat},"lng":${ne ? ne.lng : this.northEast.lng}}}`)
      .subscribe(setoresIbge => {
        if (this.setoresLayer) {
          this.setoresLayer.clearLayers();
        }

        const dados = setoresIbge['SETORES'].map((setor) => {
          cont++;


          const densidade = setor['V009'];
          if (densidade < minimo) {
            minimo = densidade;
          }
          if (densidade > maximo) {
            maximo = densidade;
          }
          return {
            type: "Feature",
            id: cont,
            properties: {
              name: setor['Nome_do_bairro'],
              densidade: setor['V009']
            },
            geometry: {
              type: "Polygon",
              coordinates: setor['geometry']['coordinates']
            }
          };
        });
        setoresGroup.clearLayers();
        for (var i = 0; i < dados.length; i++) {
          const setorLayer = L.geoJSON(dados[i], {
            style: (feature) => ({
              fillColor: getColor(dados[i].properties.densidade),
              fillOpacity: 0.5,
              stroke: true,
              weight: 1,
              color: 'white'
            }),
            onEachFeature: (feature, layer) => {

              let qtdClientes = 0;

              layer.bindPopup(`Nome: ${feature.properties.name}<br>Densidade: ${feature.properties.densidade}<br>Numero de Clientes: ${qtdClientes}`);
            
              layer.on({
                click: async (e) => {
                  
                  ArrayCoord = [];
                  feature.geometry['coordinates'][0].forEach((coord) => {
                    ArrayCoord.push([coord[0], coord[1]]);
                  });
                            
                  const qtdClientes = await this.obterClientesPorSetor(ArrayCoord);
                  console.log(qtdClientes);
                  
                  layer.setPopupContent(`Nome: ${feature.properties.name}<br>Densidade: ${feature.properties.densidade}<br>Numero de Clientes: ${qtdClientes}`);
                },
                mouseover: (e) => (this.highlightFeature(e)),
                mouseout: (e) => (this.resetFeature(e))
              });
            }

          });
          setorLayer.addTo(setoresGroup);
          clienteGroup.clearLayers();
          setoresGroup.addTo(this.map);

        }
        this.dados = dados
        // console.log(minimo)
        // console.log(maximo)

        this.legenda()

      })


  };

  async obterClientesPorSetor(coordenadas) {
    this.isLoading = true;
    const geoApiQuery = {
      "map_bounds_poligono": {
        "polygon": coordenadas
      }
    };
    const clientesSebrae = await new Promise((resolve, reject) => {
      this.markerService.makeclientsMarkers(geoApiQuery, 'PJ', true, false, false).subscribe({
        next: clientes => {
          this.markersClusters.clearLayers();
          for (var i = 0; i < clientes['CLIENTES'].length; i++) {
            const lon = clientes['CLIENTES'][i].LOCATION.coordinates[0];
            const lat = clientes['CLIENTES'][i].LOCATION.coordinates[1];
            const marker = L.marker([lat, lon]).bindPopup(
              `Código: <b>${clientes['CLIENTES'][i]["CODPARCEIRO"]}</b>
               <br>Renda Media: <b>${clientes['CLIENTES'][i]["RENDA_NOMINAL_MEDIA"]}</b>
               <br>Renda Media: <b>${clientes['CLIENTES'][i]["RENDA_NOMINAL_MEDIA"]}</b>
              `
            );
            this.markersClusters.addLayer(marker)
          }
          this.markersClusters.addTo(clienteGroup);
          clienteGroup.addTo(this.map);
          this.clientesSebrae = clientes;
          console.log(clientes['CLIENTES'])
          const qtdClientes = clientes['CLIENTES'].length;
          const qtdRealiEmpreendedorismo = clientes['CLIENTES'][i]["TEMA_REALI_EMPREENDEDORISMO"];
          const qtdRealiFinancas = clientes['CLIENTES'][i]["TEMA_REALI_FINANCAS"];
          const qtdRealiInovacao = clientes['CLIENTES'][i]["TEMA_REALI_INOVACAO"];
          const qtdRealiLeiseNormas = clientes['CLIENTES'][i]["TEMA_REALI_LEIS_E_NORMAS"];
          const qtdRealiMercado = clientes['CLIENTES'][i]["TEMA_REALI_MERCADO"];
          const qtdRealiPessoas = clientes['CLIENTES'][i]["TEMA_REALI_PESSOAS"];
          const qtdRealiProcessos = clientes['CLIENTES'][i]["TEMA_REALI_PROCESSOS"];
          const cluster = clientes['CLIENTES'][i]["TP_CLUSTER"];

          resolve(qtdClientes);
        },
        error: error => {
          reject(error);
        },
        complete: () => {
          setTimeout(() => {
            this.isLoading = false;
          },);
        }
      });
    });
    return clientesSebrae;
  }


  obterCliente() {
    this.isLoading = true
  
    this.markerService.makeclientsMarkers(this.geoApiQuery, 'PJ', true, false, false).subscribe(clientesSebrae => {
      this.markersClusters.clearLayers();
  
      for (var i = 0; i < clientesSebrae['CLIENTES'].length; i++) {
        const lon = clientesSebrae['CLIENTES'][i].LOCATION.coordinates[0];
        const lat = clientesSebrae['CLIENTES'][i].LOCATION.coordinates[1];
        const marker = L.marker([lat, lon]).bindPopup(
          `Código: <b>${clientesSebrae['CLIENTES'][i]["CODPARCEIRO"]}</b>
           <br>Renda Media: <b>${clientesSebrae['CLIENTES'][i]["RENDA_NOMINAL_MEDIA"]}</b>
          `
        );
  
        this.markersClusters.addLayer(marker)
  
      }
      this.markersClusters.addTo(clienteGroup);
  
      clienteGroup.addTo(this.map)
      this.clientesSebrae = clientesSebrae;
      this.isLoading = false; 
    })
  }


  checkBounds(type?, layer?) {


    let ArrayCoord: any = []

    this.centroBounds = this.map.getCenter();
    clienteGroup.clearLayers();

    if (type == 'polygon') {
      layer.editing.latlngs[0][0].forEach((coord) => {
        ArrayCoord.push([coord.lng, coord.lat]);
      });
      ArrayCoord.push(ArrayCoord[0]);
      this.geoApiQuery = {
        map_bounds_poligono: {
          polygon: ArrayCoord
        }
      }
      console.log(ArrayCoord)
      console.log(this.geoApiQuery)
    }
    else if (type == 'circle') {

      this.geoApiQuery = {
        map_center_circulo: {
          center: {
            lat: layer.getLatLng().lat,
            lng: layer.getLatLng().lng
          },
          radius: layer.getRadius()
        }
      }

    } else {
      this.geoApiQuery = {
        map_bounds_retangulo: {
          bottomLeft: {
            lat: this.southWest.lat,
            lng: this.southWest.lng
          },
          topRight: {
            lat: this.northEast.lat,
            lng: this.northEast.lng
          },
        },
      }
    };
    // console.log(this.geoApiQuery)
    this.obterCliente()

  }
}


