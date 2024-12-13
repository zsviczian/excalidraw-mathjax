import { Plugin } from 'obsidian';
import {mathjax} from "mathjax-full/js/mathjax";
import {TeX} from 'mathjax-full/js/input/tex.js';
import {SVG} from 'mathjax-full/js/output/svg.js';
import {LiteAdaptor, liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages.js';
import { customAlphabet } from "nanoid";

import { TFile } from "obsidian";
import { MathDocument } from "mathjax-full/js/core/MathDocument";

const fileid = customAlphabet("1234567890abcdef", 40);

export default class LaTeXSVGGeneratorPlugin extends Plugin {
  private preamble: string | null = null;
  private adaptor: LiteAdaptor;
  private html: MathDocument<any, any, any>;
  private PLUGIN_VERSION = process.env.PLUGIN_VERSION;

  async onload() {
  }

  private loadPreamble = async  () => {
    const file = this.app.vault.getAbstractFileByPath("preamble.sty");
    this.preamble = file && file instanceof TFile
      ? await this.app.vault.read(file)
      : null;
  };
    
  public async tex2SVG (
    tex: string,
    scale: number = 4 // Default scale value, adjust as needed
  ): Promise<{
    mimeType: string;
    fileId: string;
    dataURL: string;
    created: number;
    size: { height: number; width: number };
  }> {
    let input: TeX<unknown, unknown, unknown>;
    let output: SVG<unknown, unknown, unknown>;
    
    if(!this.adaptor) {
      await this.loadPreamble();
      this.adaptor = liteAdaptor();
      RegisterHTMLHandler(this.adaptor);
      input = new TeX({
      packages: AllPackages,
      ...Boolean(this.preamble) ? {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']]
      } : {},
      });
      output = new SVG({ fontCache: "local" });
      this.html = mathjax.document("", { InputJax: input, OutputJax: output });
    }
    try {
      const node = this.html.convert(
      Boolean(this.preamble) ? `${this.preamble}${tex}` : tex,
      { display: true, scale }
      );
      const svg = new DOMParser().parseFromString(this.adaptor.innerHTML(node), "image/svg+xml").firstChild as SVGSVGElement;
      if (svg) {
        if(svg.width.baseVal.valueInSpecifiedUnits < 2) {
          svg.width.baseVal.valueAsString = `${(svg.width.baseVal.valueInSpecifiedUnits+1).toFixed(3)}ex`;
        }
        const img = this.svgToBase64(svg.outerHTML);
        svg.width.baseVal.valueAsString = (svg.width.baseVal.valueInSpecifiedUnits * 10).toFixed(3);
        svg.height.baseVal.valueAsString = (svg.height.baseVal.valueInSpecifiedUnits * 10).toFixed(3);

        const dataURL = this.svgToBase64(svg.outerHTML);
        return {
          mimeType: "image/svg+xml",
          fileId: fileid(),
          dataURL: dataURL,
          created: Date.now(),
          size: await this.getImageSize(img),
        };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  private svgToBase64 (svg: string): string {
    return `data:image/svg+xml;base64,${btoa(
      decodeURIComponent(encodeURIComponent(svg.replaceAll("&nbsp;", " "))),
    )}`;
  };

  private async getImageSize (
    src: string,
  ): Promise<{ height: number; width: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        //console.log({ height: img.naturalHeight, width: img.naturalWidth, img});
        resolve({ height: img.naturalHeight, width: img.naturalWidth });
      };
      img.onerror = reject;
      img.src = src;
    });
  };
}

