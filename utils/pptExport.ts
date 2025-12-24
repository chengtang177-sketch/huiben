
import pptxgen from "pptxgenjs";
import { GeneratedScript } from "../types";

export const downloadPpt = async (script: GeneratedScript) => {
  const pres = new pptxgen();

  // 1. Title Slide
  const titleSlide = pres.addSlide();
  titleSlide.background = { fill: "FFFFFF" };
  
  titleSlide.addText(script.title, {
    x: 0,
    y: "35%",
    w: "100%",
    align: "center",
    fontSize: 44,
    bold: true,
    color: "333333",
  });

  titleSlide.addText(script.introduction, {
    x: "10%",
    y: "55%",
    w: "80%",
    align: "center",
    fontSize: 18,
    color: "666666",
  });

  titleSlide.addShape(pres.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.1,
    fill: { color: "EC4899" }
  });

  // 2. Story Slides
  for (const [index, frame] of script.frames.entries()) {
    const slide = pres.addSlide();
    
    // Image (if exists) - Adjusted for 16:9 landscape layout
    if (frame.imageUrl) {
      // Fix: pptxgenjs sizing config requires w and h to match the layout dimensions
      slide.addImage({
        data: frame.imageUrl,
        x: 0,
        y: 0,
        w: "100%",
        h: "75%",
        sizing: { type: "contain", w: "100%", h: "75%" }
      });
    } else {
      slide.addText("图片未生成", {
        x: 0,
        y: 0,
        w: "100%",
        h: "75%",
        align: "center",
        color: "CCCCCC"
      });
    }

    // Text box at bottom
    slide.addText(frame.storyText, {
      x: "5%",
      y: "75%",
      w: "90%",
      h: "20%",
      align: "center",
      valign: "middle",
      fontSize: 20,
      italic: true,
      color: "1A1A1A",
    });

    // Slide number
    slide.addText(`${index + 1}`, {
        x: "93%",
        y: "92%",
        w: "5%",
        fontSize: 10,
        color: "CCCCCC",
        bold: true
    });
  }

  // Save the presentation
  await pres.writeFile({ fileName: `${script.title || 'MommyBook'}.pptx` });
};
