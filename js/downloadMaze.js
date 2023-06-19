//convert svg doc element to base64
function makeSvg64(svgEl) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const svg64 = btoa(xml);
  const b64Start = "data:image/svg+xml;base64,";
  return b64Start + svg64;
}

//return both solved and unsolved base64s
function setMazes64() {
  const svg = document.getElementsByTagName("svg")[0];
  const mazes64 = {};

  mazes64.maze = makeSvg64(svg);
  solution.setAttribute("style", "");
  mazes64.mazeSolved = makeSvg64(svg);
  solution.setAttribute("style", "display: none;");

  return mazes64;
}

//accept both base64s, zip them and download
function zipPngJpgMazes(mazes64, type, zip, mazeFile) {
  const svg = document.getElementsByTagName("svg")[0];
  const { height, width } = svg.getBoundingClientRect();

  let i = 0;
  Object.keys(mazes64).forEach((key) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    if (type === "jpeg") {
      ctx.fillStyle = "white"; // background color for the canvas
      ctx.fillRect(0, 0, width, height); // fill the color on the canvas
    }

    const image = new Image();
    image.onload = () => {
      ctx.drawImage(image, 0, 0, width, height);
      image.width;

      zipImages(canvas);
    };
    image.src = mazes64[key];

    const zipImages = (canvas) => {
      canvas.toBlob((blob) => {
        console.log(key, type);
        mazeFile.file(`${key}.${type}`, blob);
        i++;

        if (i === 2) downloadMazeZip(zip);
      }, `image/${type}`);
      canvas.remove();
    };
  });
}

///accept both 64s and a pdf type, create a pdf then download
function handlePDF(mazes64, pdfType) {
  const svg = document.getElementsByTagName("svg")[0];
  const { height, width } = svg.getBoundingClientRect();

  const pdf = new jspdf.jsPDF("p", "px", pdfType);

  let i = 0;
  Object.keys(mazes64).forEach((key) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "white"; // background color for the canvas
    ctx.fillRect(0, 0, width, height); // fill the color on the canvas

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const widthRatio = pageWidth / canvas.width;
    const heightRatio = pageHeight / canvas.height;
    const ratio = widthRatio > heightRatio ? heightRatio : widthRatio;

    const canvasWidth = canvas.width * ratio;
    const canvasHeight = canvas.height * ratio;

    const marginX = (pageWidth - canvasWidth) / 2;
    const marginY = (pageHeight - canvasHeight) / 2;

    const image = new Image();
    image.onload = () => {
      ctx.drawImage(
        image,
        0,
        0,
        width, //* (pdf.internal.pageSize.getWidth() / width),
        height //* (pdf.internal.pageSize.getWidth() / height)
      );
      addToPDF(canvas);
    };
    image.src = mazes64[key];

    const addToPDF = (canvas) => {
      canvas.toBlob(function (blob) {
        const imgSrc = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
          if (i === 1) {
            pdf.addPage(pdfType);
          }
          pdf.addImage(
            image,
            marginX,
            marginY,
            width * ratio,
            height * ratio,
            key,
            "FAST"
          );
          i++;
          if (i === 2) pdf.save("maze.pdf");
        };
        image.src = imgSrc;
      });
    };
  });
}

//accept both 64s, retain svg format and zip
function zipSvgMazes(mazes64, zip, mazeFile) {
  let i = 0;
  Object.keys(mazes64).forEach((key) => {
    mazeFile.file(`${key}.svg`, mazes64[key].split(";base64")[1], {
      base64: true,
    });
    i++;
    if (i === 2) downloadMazeZip(zip);
  });
}

//start zip download
function downloadMazeZip(zip) {
  zip.generateAsync({ type: "blob" }).then((content) => {
    saveAs(content, "maze.zip");
  });
}

//entry point
function downloadMaze(e) {
  const zip = new JSZip();
  const mazeFile = zip.folder("maze");

  e.preventDefault();
  const mazes64 = setMazes64();
  const type = getType(e);

  switch (type) {
    case "png":
    case "jpeg":
      //if png or jpg/jpeg
      zipPngJpgMazes(mazes64, type, zip, mazeFile);
      break;
    case "svg":
      //if svg
      zipSvgMazes(mazes64, zip, mazeFile);
      break;
    case "pdf":
      //if pdf
      handlePDF(mazes64, getPdfType(e));
      break;
    default:
      console.log("format not supported");
  }
}

//get img type
function getType(e) {
  const form = e.target;
  const formData = new FormData(form);
  return formData.get("type");
}

//get pdf type
function getPdfType(e) {
  const form = e.target;
  const formData = new FormData(form);
  return formData.get("pdf-type");
}

//run if image type changes
function handleDownloadTypeChange(e) {
  const pdfTypeEl = document.getElementById("pdf-type");
  if (e.target.value === "pdf") {
    pdfTypeEl.style.display = "inline";
  } else {
    pdfTypeEl.style.display = "none";
  }
}
