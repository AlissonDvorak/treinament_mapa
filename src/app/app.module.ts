import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { HttpClientModule } from '@angular/common/http';
import { MarkerService } from './marker.service';

import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';
import { PopUpService } from './popup.service';
import { ShapeService } from './shape.service';
import { DialogComponent } from './dialog/dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { LoadingComponent } from './loading/loading.component';
import { NgxSliderModule } from '@angular-slider/ngx-slider';




@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    DialogComponent,
    LoadingComponent,

 
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    MatDialogModule,
    NgxSliderModule

  ],
  providers: [
    MarkerService,
    PopUpService,
    ShapeService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }