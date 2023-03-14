import { Component, AfterViewInit } from '@angular/core';
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
        clienteGroup.clearLayers();
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
    var nClientes,
      rendaMedia: any = [],
      sum = 0


    let cliente = this.clientesSebrae
    nClientes = cliente['CLIENTES'].length

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
              layer.bindPopup(`Nome: ${feature.properties.name}<br>Densidade: ${feature.properties.densidade}<br>Numero de Clientes: ${feature.properties.densidade}
              `);
              layer.on({
                click: (e) => {
                  console.log()

                  // chamar funcao q calcula quais clientes estao dentro desse poligono(utilizar bounds disponiveis na variavel dados[i])

                  const feature = e.target.feature;
                  const numClientes = feature.properties["Numero de Clientes"] || 0;
                  const empreend = feature.properties["empreendedorismo"] || 0;
                  const finan = feature.properties["financas"] || 0;
                  const inov = feature.properties["inovacao"] || 0;
                  const leisnormas = feature.properties["leis e normas"] || 0;
                  const mercado = feature.properties["mercado"] || 0;
                  const organizacao = feature.properties["organizacao"] || 0;
                  const pessoas = feature.properties["pessoas"] || 0;
                  const processos = feature.properties["processos"] || 0;
                  const numRealizacoes = (empreend + finan + inov + leisnormas + mercado + organizacao + pessoas + processos)
                  console.log(feature.properties)
                  layer.bindPopup(`Nome: ${feature.properties.name}<br>Densidade: ${feature.properties.densidade}<br>Número de Clientes: ${numClientes}<br>Qtd realizacoes : ${numRealizacoes}`);
                },
                mouseover: (e) => (this.highlightFeature(e)),
                mouseout: (e) => (this.resetFeature(e)),
              })
            }

          });
          setorLayer.addTo(setoresGroup);
          clienteGroup.clearLayers();
          setoresGroup.addTo(this.map);

        }
        this.dados = dados
        console.log(minimo)
        console.log(maximo)

        this.legenda()

      })


  };

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
    })

    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
  }



  // obterCliente() {
  //   this.isLoading = true


  //   this.markerService.makeclientsMarkers(this.geoApiQuery, 'PJ', true, false, false).subscribe(clientesSebrae => {
  //     this.markersClusters.clearLayers();
  //     let clientesPorSetor = {};

      

  //     for (var i = 0; i < clientesSebrae['CLIENTES'].length; i++) {
  //       const lon = clientesSebrae['CLIENTES'][i].LOCATION.coordinates[0];
  //       const lat = clientesSebrae['CLIENTES'][i].LOCATION.coordinates[1];

  //       for (var j = 0; j < this.dados.length; j++) {
  //         const setor = this.dados[j];

         

  //         if (turf.booleanPointInPolygon(turf.point([lon, lat]), setor.geometry)) {
  //           if (!clientesPorSetor[j]) {
  //             clientesPorSetor[j] = {
  //               "Quantidade": 1,
  //               "TEMA_REALI_EMPREENDEDORISMO" : clientesSebrae['CLIENTES'][j].TEMA_REALI_EMPREENDEDORISMO,
  //               "TEMA_REALI_FINANCAS" : clientesSebrae['CLIENTES'][j].TEMA_REALI_FINANCAS,
  //               "TEMA_REALI_INOVACAO" : clientesSebrae['CLIENTES'][j].TEMA_REALI_INOVACAO,
  //               "TEMA_REALI_LEIS_E_NORMAS" : clientesSebrae['CLIENTES'][j].TEMA_REALI_LEIS_E_NORMAS,
  //               "TEMA_REALI_MERCADO" : clientesSebrae['CLIENTES'][j].TEMA_REALI_MERCADO,
  //               "TEMA_REALI_ORGANIZACAO" : clientesSebrae['CLIENTES'][j].TEMA_REALI_ORGANIZACAO,
  //               "TEMA_REALI_PESSOAS" : clientesSebrae['CLIENTES'][j].TEMA_REALI_PESSOAS,
  //               "TEMA_REALI_PROCESSOS" : clientesSebrae['CLIENTES'][j].TEMA_REALI_PROCESSOS
  //             };

  //           } else {
  //             clientesPorSetor[j] = {

  //               "Quantidade": clientesPorSetor[j]['Quantidade']++ ,
  //               "TEMA_REALI_EMPREENDEDORISMO" : clientesPorSetor[j]["TEMA_REALI_EMPREENDEDORISMO"] += clientesSebrae['CLIENTES'][j].TEMA_REALI_EMPREENDEDORISMO,
  //               "TEMA_REALI_FINANCAS" : clientesPorSetor[j]["TEMA_REALI_FINANCAS"] += clientesSebrae['CLIENTES'][j].TEMA_REALI_FINANCAS,
  //               "TEMA_REALI_INOVACAO" : clientesPorSetor[j]["TEMA_REALI_INOVACAO"] += clientesSebrae['CLIENTES'][j].TEMA_REALI_INOVACAO,
  //               "TEMA_REALI_LEIS_E_NORMAS" : clientesPorSetor[j]["TEMA_REALI_LEIS_E_NORMAS"] += clientesSebrae['CLIENTES'][j].TEMA_REALI_LEIS_E_NORMAS,
  //               "TEMA_REALI_MERCADO" : clientesPorSetor[j]["TEMA_REALI_MERCADO"] += clientesSebrae['CLIENTES'][j].TEMA_REALI_MERCADO,
  //               "TEMA_REALI_ORGANIZACAO" : clientesPorSetor[j]["TEMA_REALI_ORGANIZACAO"] += clientesSebrae['CLIENTES'][j].TEMA_REALI_ORGANIZACAO,
  //               "TEMA_REALI_PESSOAS" : clientesPorSetor[j]["TEMA_REALI_PESSOAS"] += clientesSebrae['CLIENTES'][j].TEMA_REALI_PESSOAS,
  //               "TEMA_REALI_PROCESSOS" : clientesPorSetor[j]["TEMA_REALI_PROCESSOS"] += clientesSebrae['CLIENTES'][j].TEMA_REALI_PROCESSOS

  //             };
  //           }
  //           break;
  //         }
  //         // console.log(clientesPorSetor[j])
  //       }
  //       const marker = L.marker([lat, lon]).bindPopup(
  //         `Código: <b>${clientesSebrae['CLIENTES'][i]["CODPARCEIRO"]}</b>
  //          <br>EMPREENDEDORISMO: <b>${clientesSebrae['CLIENTES'][i]["TEMA_REALI_EMPREENDEDORISMO"]}</b>
  //          <br>FINANCAS: <b>${clientesSebrae['CLIENTES'][i]["TEMA_REALI_FINANCAS"]}</b>
  //          `
  //       );
  //       this.markersClusters.addLayer(marker)
  //     }
  //     this.markersClusters.addTo(clienteGroup);

  //     for (var k = 0; k < this.dados.length; k++) {
  //       const setor = this.dados[k];
  //       if (clientesPorSetor[k]) {
  //         setor.properties = clientesPorSetor[k];
          
  //       } else {
  //         setor.properties["Numero de Clientes"] = 0;
  //       }
  //     }
  //     clienteGroup.addTo(this.map)
  //     this.clientesSebrae = clientesSebrae;
  //   })

    // setTimeout(() => {
    //   this.isLoading = false;
    // }, 2000);

  // }

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
    this.obterCliente()

  }
}


