import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import * as pdfTypes from 'pdfjs-dist';
import * as PDFJS from 'pdfjs-dist/build/pdf';
import * as pdfjsViewer from 'pdfjs-dist/web/pdf_viewer';

let SVG_NS = 'http://www.w3.org/2000/svg';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  title = 'app';
  _pdf: any;
  _zoom: number = 1;
  _rotation: number = 0;
  viewport: any;
  totalPages: number;
  docLoaded: boolean = false;
  page: number = 1;

  @ViewChild('textLayer') textLayer: ElementRef;
  @ViewChild('pdf') canvas: ElementRef;
  public context: CanvasRenderingContext2D;

  ngAfterViewInit(): void {
    this.context = this.canvas.nativeElement.getContext('2d');
    this.loadPdf();
  }

  zoomIn() {
    this._zoom = this._zoom + .25;
    this.renderPage(this.page);
  }

  zoomOut() {
    this._zoom = this._zoom - .25;
    this.renderPage(this.page);
  }

  previousPage() {
    this.clearTextLayer();
    if (this.page > 1) {
      this.page = this.page-1;
      this.renderPage(this.page);
    }
  }

  nextPage() {
    this.clearTextLayer();
    if (this.page < this.totalPages) {
      this.page = this.page+1;
      this.renderPage(this.page);
    }
  }

  clearTextLayer() {
    while (this.textLayer.nativeElement.firstChild) {
      this.textLayer.nativeElement.removeChild(this.textLayer.nativeElement.firstChild);
    }
  }

  private loadPdf(){
    if (this._pdf) {
      this._pdf.destroy();
    }
    let url: string = './assets/pdf.10.pdf';
    let loadingTask:any = PDFJS.getDocument({url: url, withCredentials: true});
    (<pdfTypes.PDFPromise<pdfTypes.PDFDocumentProxy>>loadingTask.promise)
      .then((pdf:pdfTypes.PDFDocumentProxy) =>{
        this._pdf = pdf;
        this.totalPages = this._pdf.numPages;
        this.renderPage(1);
        this.docLoaded = true;
      }, (error:any)=>{
        console.log(error);
      });
  }

  private renderPage(pageNumber: number) {
    return this._pdf.getPage(pageNumber).then(this.renderPageToCanvas);
  }

  private renderPageToCanvas = (page: pdfTypes.PDFPageProxy) => {
    this.viewport = page.getViewport(this._zoom, this._rotation);
    this.canvas.nativeElement.width = this.viewport.width;
    this.canvas.nativeElement.height = this.viewport.height;
    var renderTask = page.render({
      canvasContext: this.context,
      viewport: this.viewport
    });

    renderTask.then(() => page.getTextContent()).then((textContent) => {
      // Pass the data to the method for rendering of text over the pdf canvas.
      this.textLayer.nativeElement.style.width = this.viewport.width + 'px';
      this.textLayer.nativeElement.style.height = this.viewport.height + 'px';
      PDFJS.renderTextLayer({
          textContent: textContent,
          container: this.textLayer.nativeElement,
          viewport: this.viewport,
          textDivs: []
      });
    });
  }
}
