export async function optimizeImageForUpload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1400;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Impossible de préparer l'image."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      image.onerror = () => reject(new Error("Impossible de charger l'image sélectionnée."));
      image.src = event.target?.result;
    };
    reader.onerror = () => reject(new Error("Impossible de lire le fichier image."));
    reader.readAsDataURL(file);
  });
}

export async function prepareDeckPhotoRegions(file) {
  const image = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier image."));
    reader.onload = () => {
      const loaded = new Image();
      loaded.onload = () => resolve(loaded);
      loaded.onerror = () => reject(new Error("Impossible de charger l'image sélectionnée."));
      loaded.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  if (Math.max(image.width, image.height) <= 1600) {
    return [await optimizeImageForUpload(file)];
  }
  const columns = image.width >= image.height ? 3 : 2;
  const rows = image.width >= image.height ? 2 : 3;
  const overlap = 0.12;
  const tileWidth = image.width / (columns - overlap * (columns - 1));
  const tileHeight = image.height / (rows - overlap * (rows - 1));
  const regions = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const sourceX = Math.min(image.width - tileWidth, column * tileWidth * (1 - overlap));
      const sourceY = Math.min(image.height - tileHeight, row * tileHeight * (1 - overlap));
      const scale = Math.min(1, 1600 / Math.max(tileWidth, tileHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(tileWidth * scale);
      canvas.height = Math.round(tileHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Impossible de préparer l'image.");
      context.drawImage(
        image,
        sourceX,
        sourceY,
        tileWidth,
        tileHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      regions.push(canvas.toDataURL("image/jpeg", 0.82));
    }
  }
  return regions;
}
