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

  @ViewChild('pdf') canvas: ElementRef;
  public context: CanvasRenderingContext2D;

  ngAfterViewInit(): void {
    this.context = this.canvas.nativeElement.getContext('2d');
    //this.loadItAgain();
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
    let textLayer = document.getElementsByClassName('page-container')[0];
    textLayer.remove();
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

    var pageContainer = document.createElement('div');
    pageContainer.classList.add('page-container');
    pageContainer.style.width = this.viewport.width + 'px';
    pageContainer.style.height = this.viewport.height + 'px';
    pageContainer.style['position']='absolute';
    pageContainer.style['top']='0';
    pageContainer.style['left']='0';
    pageContainer.style['font-size']='1px';
    pageContainer.style['line-height']='1';
    document.getElementById('main-container').appendChild(pageContainer);

    this.renderText(pageContainer, page);

    return Promise.resolve();
  }

  renderText(pageContainer, page) {
    page.getTextContent({ normalizeWhitespace: true, combineTextItems: true }).then((textContent) => {
      textContent.items.forEach((textItem) => {
        var tx = PDFJS.Util.transform(
          PDFJS.Util.transform(this.viewport.transform, textItem.transform),
          [1, 0, 0, -1, 0, 0]
        );

        var style = textContent.styles[textItem.fontName];

        // adjust for font ascent/descent
        var fontSize = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));

        if (style.ascent) {
          tx[5] -= fontSize * style.ascent;
        } else if (style.descent) {
          tx[5] -= fontSize * (1 + style.descent);
        } else {
          tx[5] -= fontSize / 2;
        }

        // adjust for rendered width
        if (textItem.width > 0) {
          this.context.font = tx[0] + 'px ' + style.fontFamily;

          var width = this.context.measureText(textItem.str).width;

          if (width > 0) {
            //tx[0] *= (textItem.width * viewport.scale) / width;
            tx[0] = (textItem.width * this.viewport.scale) / width;
          }
        }

        // var item = document.createElementNS('http://www.w3.org/2000/svg', 'svg:text');
        // item.textContent = textItem.str;
        // item.setAttribute('font-family', style.fontFamily);
        // item.setAttribute('transform', 'matrix(' + tx.join(' ') + ')');

        var item = document.createElement('span');
        item.textContent = textItem.str;
        item.style.fontFamily = style.fontFamily;
        //item.style.transform = 'matrix(' + tx.join(',') + ')';
        item.style.position='absolute';
        item.style.cursor='text';
        item.style['white-space']='pre';
        item.style['transform-origin']='left bottom';
        item.style.fontSize = fontSize + 'px';
        item.style.transform = 'scaleX(' + tx[0] + ')';
        item.style.left = tx[4] + 'px';
        item.style.top = tx[5] + 'px';
        item.style.color = 'transparent';

        pageContainer.appendChild(item);
      });
    });
  }

  buildSVG(viewport, textContent) {
    // Building SVG with size of the viewport (for simplicity)
    var svg = document.createElementNS(SVG_NS, 'svg:svg');
    svg.setAttribute('width', viewport.width + 'px');
    svg.setAttribute('height', viewport.height + 'px');
    // items are transformed to have 1px font size
    svg.setAttribute('font-size', '1');

    // processing all items
    textContent.items.forEach(function (textItem) {
      // we have to take in account viewport transform, which includes scale,
      // rotation and Y-axis flip, and not forgetting to flip text.
      var tx = PDFJS.Util.transform(
        PDFJS.Util.transform(viewport.transform, textItem.transform),
        [1, 0, 0, -1, 0, 0]);
        var style = textContent.styles[textItem.fontName];
        // adding text element
        var text = document.createElementNS(SVG_NS, 'svg:text');
        text.setAttribute('transform', 'matrix(' + tx.join(' ') + ')');
        text.setAttribute('font-family', style.fontFamily);
        text.textContent = textItem.str;
        svg.appendChild(text);
    });
    return svg;
  }

  loadItAgain() {

    var CMAP_URL = '../../node_modules/pdfjs-dist/cmaps/';
    var CMAP_PACKED = true;

    var DEFAULT_URL = './assets/pdf.10.pdf';
    var PAGE_TO_VIEW = 1;
    var SCALE = 1.0;

    var container = document.getElementById('pageContainer');

    // Loading document.
    var loadingTask = PDFJS.getDocument({
      url: DEFAULT_URL,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
    });
    loadingTask.promise.then((pdfDocument) => {
      // Document loaded, retrieving the page.
      return pdfDocument.getPage(PAGE_TO_VIEW).then((pdfPage) => {
        // Creating the page view with default parameters.
        var pdfPageView = new pdfjsViewer.PDFPageView({
          container: container,
          id: PAGE_TO_VIEW,
          scale: SCALE,
          defaultViewport: pdfPage.getViewport({ scale: SCALE, }),
          // We can enable text/annotations layers, if needed
          textLayerFactory: new pdfjsViewer.DefaultTextLayerFactory(),
          annotationLayerFactory: new pdfjsViewer.DefaultAnnotationLayerFactory(),
        });
        // Associates the actual page with the view, and drawing it
        pdfPageView.setPdfPage(pdfPage);
        return pdfPageView.draw();
      });
    });
  }
}
