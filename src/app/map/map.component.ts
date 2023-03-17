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
import 'leaflet-range';
import { Options } from '@angular-slider/ngx-slider';
import * as turf from '@turf/turf';
import * as pointIp from 'robust-point-in-polygon';


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
  valorfiltro = 0
  minValue: number = 0;
  maxValue: number = 100;
  options: Options = {
    ceil: 100,
    showSelectionBar: true,
    selectionBarGradient: {
      from: 'white',
      to: '#FC0'
    }
  };

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
  grupoUnidades: any


  // obter cordenadas da tela
  private getMapBounds() {
    var bounds = this.map.getBounds();
    this.northEast = bounds.getNorthEast();
    this.southWest = bounds.getSouthWest();
  }


  private initMap(): void {

    // inicializar mapa leaftlet
    this.map = L.map('map', {
      zoomControl: false,
      zoomAnimation: true,
      center: [-9.66625, -35.7351],
      zoom: 15.5,
    });

    this.basemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    this.basemap.addTo(this.map);
    this.getMapBounds()

    //  controle movimentacao mapa
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
      // this.checkBounds();
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


  // pop up ao desenhar um circulo ou poligono
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


  // Cria os marcadores da unidades Sebrae
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

  // inicia os componentes
  ngAfterViewInit(): void {

    this.initMap();
    this.makeUnidades()
    this.obterSetores()
    this.checkBounds()
  }

  // Renderiza os todos os setores que estao na tela
  obterSetores(sw?, ne?) {
    let cont = 0;
    minimo = Infinity
    maximo = -Infinity
    let ArrayCoord: any = []

    const slider = document.getElementById("renda-slider") as HTMLInputElement;
    const output = document.getElementById("slider-value");
    output!.innerHTML = slider.value;
    slider.addEventListener("input", () => {
      const rendaMinima = parseInt(slider.value);
      this.obterSetoresFiltrados(rendaMinima);
      output!.innerHTML = slider.value;
    });

    this.shapeService.getStateShapes(`{"bottomLeft":{"lat":${sw ? sw.lat : this.southWest.lat}, "lng":${sw ? sw.lng : this.southWest.lng}},
    "topRight":{"lat":${ne ? ne.lat : this.northEast.lat},"lng":${ne ? ne.lng : this.northEast.lng}}}`)
      .subscribe(setoresIbge => {
        if (this.setoresLayer) {
          this.setoresLayer.clearLayers();
        }

        const dados = setoresIbge['SETORES'].map((setor) => {
          cont++;
          const renda = setor['V009'];
          if (renda < minimo) {
            minimo = renda;
          }
          if (renda > maximo) {
            maximo = renda;
          }
          

          return {
            type: "Feature",
            id: cont,
            properties: {
              name: setor['Nome_do_bairro'],
              renda: setor['V009'],
              realizacoes: this.filtrarPorRealizacoes(setor['geometry']['coordinates'])[0]
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
              fillColor: getColor(dados[i].properties.renda),
              fillOpacity: 0.5,
              stroke: true,
              weight: 1,
              color: 'white'
            }),
            onEachFeature: (feature, layer) => {

              let qtdClientes = 0;
              let qtdRealiEmpreendedorismo = 0;
              layer.bindPopup(`Nome: ${feature.properties.name}<br>Renda Media: ${feature.properties.renda}<br>Numero de Clientes: ${qtdClientes}<br>Numero de Clientes: ${qtdRealiEmpreendedorismo}`);
              layer.on({
                click: async (e) => {

                  ArrayCoord = [];
                  feature.geometry['coordinates'][0].forEach((coord) => {
                    ArrayCoord.push([coord[0], coord[1]]);
                  });

                  const { qtdClientes, qtdRealiEmpreendedorismo, qtdRealiFinancas, qtdRealiInovacao, qtdRealiLeiseNormas, qtdRealiMercado, qtdRealiPessoas, qtdRealiProcessos, } = await this.obterClientesPorSetor(ArrayCoord);

                  layer.setPopupContent(`Nome: ${feature.properties.name}
                  <br>Renda media: ${feature.properties.renda}
                  <br>Numero de Clientes: ${qtdClientes}
                  <br>Realizacoes Empreendedorismo: ${qtdRealiEmpreendedorismo}
                  <br>Realizacoes Financas: ${qtdRealiFinancas}
                  <br>Realizacoes Inovacao: ${qtdRealiInovacao}
                  <br>Realizacoes Leis e Normas: ${qtdRealiLeiseNormas}
                  <br>Realizacoes Mercado: ${qtdRealiMercado}
                  <br>Realizacoes Pessoas: ${qtdRealiPessoas}
                  <br>Realizacoes Processos: ${qtdRealiProcessos}
                  <br>Total de Realizacoes: ${qtdRealiEmpreendedorismo + qtdRealiFinancas + qtdRealiInovacao + qtdRealiLeiseNormas + qtdRealiMercado + qtdRealiPessoas + qtdRealiProcessos}
                
                  `);
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
        console.log(dados)
        this.legenda()
      })
  };
  recarregarMapa(){
    this.obterSetores(this.northEast, this.southWest);
    this.checkBounds();

  }

  filtrarPorRealizacoes(setorArr: any) {
    let clientesPorSetor: any = {
       N_CLIENTES: 0,
       TEMA_REALI_EMPREENDEDORISMO : 0, 
       TEMA_REALI_FINANCAS : 0 ,
       TEMA_REALI_INOVACAO : 0, 
       TEMA_REALI_LEIS_E_NORMAS : 0,
       TEMA_REALI_MERCADO : 0 ,
       TEMA_REALI_ORGANIZACAO : 0,
       TEMA_REALI_PESSOAS : 0 ,
       TEMA_REALI_PROCESSOS : 0
    };

    let pip = pointIp;
    let setor = 0
      this.markerService.makeclientsMarkers(this.geoApiQuery, 'PJ', true, false, false).subscribe(clientesSebrae => {

        for (var i = 0; i < clientesSebrae['CLIENTES'].length; i++) {
          const lon = clientesSebrae['CLIENTES'][i].LOCATION.coordinates[0];
          const lat = clientesSebrae['CLIENTES'][i].LOCATION.coordinates[1]

            if(pip(setorArr[0], [lon, lat]) != 1){
              
              clientesPorSetor.N_CLIENTES++
              clientesPorSetor.TEMA_REALI_EMPREENDEDORISMO += clientesSebrae['CLIENTES'][i].TEMA_REALI_EMPREENDEDORISMO;
              clientesPorSetor.TEMA_REALI_FINANCAS += clientesSebrae['CLIENTES'][i].TEMA_REALI_FINANCAS;
              clientesPorSetor.TEMA_REALI_INOVACAO += clientesSebrae['CLIENTES'][i].TEMA_REALI_INOVACAO;
              clientesPorSetor.TEMA_REALI_LEIS_E_NORMAS += clientesSebrae['CLIENTES'][i].TEMA_REALI_LEIS_E_NORMAS;
              clientesPorSetor.TEMA_REALI_MERCADO += clientesSebrae['CLIENTES'][i].TEMA_REALI_MERCADO;
              clientesPorSetor.TEMA_REALI_ORGANIZACAO += clientesSebrae['CLIENTES'][i].TEMA_REALI_ORGANIZACAO;
              clientesPorSetor.TEMA_REALI_PESSOAS += clientesSebrae['CLIENTES'][i].TEMA_REALI_PESSOAS;
              clientesPorSetor.TEMA_REALI_PROCESSOS += clientesSebrae['CLIENTES'][i].TEMA_REALI_PROCESSOS;        

            }
    
    
        }
      })

    return [clientesPorSetor]
   
   }

   obterSetoresFilRealiz(numero?) {

    let ArrayCoord: any = []
    const dadosFiltrados = this.dados.filter(setor => setor.properties.realizacoes[this.valorfiltro] <= this.maxValue  && this.minValue <= setor.properties.realizacoes[this.valorfiltro] );
    console.log(this.dados[0].properties.realizacoes.TEMA_REALI_ORGANIZACAO)
    
    setoresGroup.clearLayers();
    this.map.removeControl(legendControl);
    for (var i = 0; i < dadosFiltrados.length; i++) {
      const setorLayer = L.geoJSON(dadosFiltrados[i], {
        style: (feature) => ({
          fillColor: getColor(dadosFiltrados[i].properties.renda),
          fillOpacity: 0.5,
          stroke: true,
          weight: 1,
          color: 'white'
        }),
        onEachFeature: (feature, layer) => {

          let qtdClientes = 0;
          let qtdRealiEmpreendedorismo = 0;
          layer.bindPopup(`Nome: ${feature.properties.name}<br>Renda Media: ${feature.properties.renda}<br>Numero de Clientes: ${qtdClientes}<br>Numero de Clientes: ${qtdRealiEmpreendedorismo}`);
          layer.on({
            click: async (e) => {

              ArrayCoord = [];
              feature.geometry['coordinates'][0].forEach((coord) => {
                ArrayCoord.push([coord[0], coord[1]]);
              });

              const { qtdClientes, qtdRealiEmpreendedorismo, qtdRealiFinancas, qtdRealiInovacao, qtdRealiLeiseNormas, qtdRealiMercado, qtdRealiPessoas, qtdRealiProcessos, } = await this.obterClientesPorSetor(ArrayCoord);

              layer.setPopupContent(`Nome: ${feature.properties.name}
              <br>Renda media: ${feature.properties.renda}
              <br>Numero de Clientes: ${qtdClientes}
              <br>Realizacoes Empreendedorismo: ${qtdRealiEmpreendedorismo}
              <br>Realizacoes Financas: ${qtdRealiFinancas}
              <br>Realizacoes Inovacao: ${qtdRealiInovacao}
              <br>Realizacoes Leis e Normas: ${qtdRealiLeiseNormas}
              <br>Realizacoes Mercado: ${qtdRealiMercado}
              <br>Realizacoes Pessoas: ${qtdRealiPessoas}
              <br>Realizacoes Processos: ${qtdRealiProcessos}
              <br>Total de Realizacoes: ${qtdRealiEmpreendedorismo + qtdRealiFinancas + qtdRealiInovacao + qtdRealiLeiseNormas + qtdRealiMercado + qtdRealiPessoas + qtdRealiProcessos}
            
              `);
            },
            mouseover: (e) => (this.highlightFeature(e)),
            mouseout: (e) => (this.resetFeature(e))
          });
        }
      });
      setorLayer.addTo(setoresGroup);
    }
  }


  // renderiza os setores apartir do filtro
  obterSetoresFiltrados(rendaMinima) {

    let ArrayCoord: any = []
    const dadosFiltrados = this.dados.filter(setor => setor.properties.renda >= rendaMinima);
    setoresGroup.clearLayers();
    this.map.removeControl(legendControl);
    for (var i = 0; i < dadosFiltrados.length; i++) {
      const setorLayer = L.geoJSON(dadosFiltrados[i], {
        style: (feature) => ({
          fillColor: getColor(dadosFiltrados[i].properties.renda),
          fillOpacity: 0.5,
          stroke: true,
          weight: 1,
          color: 'white'
        }),
        onEachFeature: (feature, layer) => {

          let qtdClientes = 0;
          let qtdRealiEmpreendedorismo = 0;
          layer.bindPopup(`Nome: ${feature.properties.name}<br>Renda Media: ${feature.properties.renda}<br>Numero de Clientes: ${qtdClientes}<br>Numero de Clientes: ${qtdRealiEmpreendedorismo}`);
          layer.on({
            click: async (e) => {

              ArrayCoord = [];
              feature.geometry['coordinates'][0].forEach((coord) => {
                ArrayCoord.push([coord[0], coord[1]]);
              });

              const { qtdClientes, qtdRealiEmpreendedorismo, qtdRealiFinancas, qtdRealiInovacao, qtdRealiLeiseNormas, qtdRealiMercado, qtdRealiPessoas, qtdRealiProcessos, } = await this.obterClientesPorSetor(ArrayCoord);

              layer.setPopupContent(`Nome: ${feature.properties.name}
              <br>Renda media: ${feature.properties.renda}
              <br>Numero de Clientes: ${qtdClientes}
              <br>Realizacoes Empreendedorismo: ${qtdRealiEmpreendedorismo}
              <br>Realizacoes Financas: ${qtdRealiFinancas}
              <br>Realizacoes Inovacao: ${qtdRealiInovacao}
              <br>Realizacoes Leis e Normas: ${qtdRealiLeiseNormas}
              <br>Realizacoes Mercado: ${qtdRealiMercado}
              <br>Realizacoes Pessoas: ${qtdRealiPessoas}
              <br>Realizacoes Processos: ${qtdRealiProcessos}
              <br>Total de Realizacoes: ${qtdRealiEmpreendedorismo + qtdRealiFinancas + qtdRealiInovacao + qtdRealiLeiseNormas + qtdRealiMercado + qtdRealiPessoas + qtdRealiProcessos}
            
              `);
            },
            mouseover: (e) => (this.highlightFeature(e)),
            mouseout: (e) => (this.resetFeature(e))
          });
        }
      });
      setorLayer.addTo(setoresGroup);
    }
  }


  // obtem os Clientes do setor clicado
  async obterClientesPorSetor(coordenadas) {

    interface MyResponse {
      qtdClientes,
      qtdRealiEmpreendedorismo,
      qtdRealiFinancas,
      qtdRealiInovacao,
      qtdRealiLeiseNormas,
      qtdRealiMercado,
      qtdRealiPessoas,
      qtdRealiProcessos: number;
    }
    this.isLoading = true;

    const geoApiQuery = {
      "map_bounds_poligono": {
        "polygon": coordenadas
      }
    };
    const clientesSebrae = await new Promise<MyResponse>((resolve, reject) => {

      let qtdRealiEmpreendedorismo = 0;
      let qtdRealiFinancas = 0
      let qtdRealiInovacao = 0
      let qtdRealiLeiseNormas = 0
      let qtdRealiMercado = 0
      let qtdRealiPessoas = 0
      let qtdRealiProcessos = 0

      this.markerService.makeclientsMarkers(geoApiQuery, 'PJ', true, false, false).subscribe({
        next: clientes => {
          this.markersClusters.clearLayers();
          for (var i = 0; i < clientes['CLIENTES'].length; i++) {
            const lon = clientes['CLIENTES'][i].LOCATION.coordinates[0];
            const lat = clientes['CLIENTES'][i].LOCATION.coordinates[1];

            const marker = L.marker([lat, lon]).bindPopup(
              `Código: <b>${clientes['CLIENTES'][i]["CODPARCEIRO"]}</b>
               <br>Renda Media: <b>${clientes['CLIENTES'][i]["RENDA_NOMINAL_MEDIA"]}</b>
               
              `
            );
            this.markersClusters.addLayer(marker)
            qtdRealiEmpreendedorismo += clientes['CLIENTES'][i]["TEMA_REALI_EMPREENDEDORISMO"];
            qtdRealiFinancas += clientes['CLIENTES'][i]["TEMA_REALI_FINANCAS"];
            qtdRealiInovacao += clientes['CLIENTES'][i]["TEMA_REALI_INOVACAO"];
            qtdRealiLeiseNormas += clientes['CLIENTES'][i]["TEMA_REALI_LEIS_E_NORMAS"];
            qtdRealiMercado += clientes['CLIENTES'][i]["TEMA_REALI_MERCADO"];
            qtdRealiPessoas += clientes['CLIENTES'][i]["TEMA_REALI_PESSOAS"];
            qtdRealiProcessos += clientes['CLIENTES'][i]["TEMA_REALI_PROCESSOS"];

          }
          this.markersClusters.addTo(clienteGroup);
          clienteGroup.addTo(this.map);
          this.clientesSebrae = clientes;

          const result = {
            qtdClientes: clientes['CLIENTES'].length,
            qtdRealiEmpreendedorismo,
            qtdRealiFinancas,
            qtdRealiInovacao,
            qtdRealiLeiseNormas,
            qtdRealiMercado,
            qtdRealiPessoas,
            qtdRealiProcessos,

          };
          resolve(result);
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


  // Renderiza os todos os clientes que estao na tela
  obterCliente(): void {
    this.isLoading = true;
    this.markerService
      .makeclientsMarkers(this.geoApiQuery, 'PJ', true, false, false)
      .subscribe((clientesSebrae) => {
        this.updateMarkers(clientesSebrae['CLIENTES']);
        this.clientesSebrae = clientesSebrae;
        this.isLoading = false;
      });
  }

  private updateMarkers(clientes: any[]): void {
    this.markersClusters.clearLayers();

    for (const cliente of clientes) {
      const lon = cliente.LOCATION.coordinates[0];
      const lat = cliente.LOCATION.coordinates[1];

      const marker = L.marker([lat, lon]).bindPopup(
        `Código: <b>${cliente.CODPARCEIRO}</b>
         <br>Renda Media: <b>${cliente.RENDA_NOMINAL_MEDIA}</b>`
      );

      this.markersClusters.addLayer(marker);
    }

    this.markersClusters.addTo(clienteGroup);
    clienteGroup.addTo(this.map);
  }


  // faz a verificacao  do tipo geometrico que foi desenhado e manda o geoApiQuery
  checkBounds(type?: string, layer?: any): void {
    let ArrayCoord: any = []
    this.centroBounds = this.map.getCenter();
    clienteGroup.clearLayers();

    switch (type) {
      case 'polygon':
        layer.editing.latlngs[0][0].forEach((coord: any) => {
          ArrayCoord.push([coord.lng, coord.lat]);
        });
        ArrayCoord.push(ArrayCoord[0]);
        this.geoApiQuery = {
          map_bounds_poligono: {
            polygon: ArrayCoord
          }
        }
        break;
      case 'circle':
        this.geoApiQuery = {
          map_center_circulo: {
            center: {
              lat: layer.getLatLng().lat,
              lng: layer.getLatLng().lng
            },
            radius: layer.getRadius()
          }
        }
        break;
      default:
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
        break;
    }
    this.obterCliente();

  }
}


