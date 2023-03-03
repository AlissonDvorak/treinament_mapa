import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PopUpService {
  constructor() { }

  makeunidadesPopup(data: any): string {
    return `` +
      `<div>Capital: ${ data.name }</div>` +
      `<div>State: ${ data.state }</div>` +
      `<div>Population: ${ data.population }</div>`
  }
}