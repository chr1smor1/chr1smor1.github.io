document.body.classList.add(`theme-${document.body.dataset.theme ?? "fish"}`);
const titleNode = document.querySelector("#sectionTitle");
const feedNode = document.querySelector("#feed");
const headerNode = document.querySelector("#sectionHeader");
const heroTitleNode = document.querySelector("#heroTitle");
const heroImageNode = document.querySelector("#heroImage");

const appendFormattedText = (target, rawText) => {
  const parts = rawText.split(/(\*[^*\n]+\*)/g);
  for (const part of parts) {
    if (!part) {
      continue;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      const em = document.createElement("em");
      em.textContent = part.slice(1, -1);
      target.append(em);
    } else {
      target.append(document.createTextNode(part));
    }
  }
};

const createPieceTextNode = (piece) => {
  if (piece.format === "silk-path") {
    const specialText = document.createElement("div");
    specialText.className = "piece-text piece-text-silk";
    let lineIndex = 0;
    for (const line of piece.text.split("\n")) {
      if (line.trim().length === 0) {
        const spacer = document.createElement("span");
        spacer.className = "piece-line piece-line-gap";
        specialText.append(spacer);
        continue;
      }
      const lineNode = document.createElement("span");
      lineNode.className = "piece-line";
      lineNode.textContent = line;
      const offset = Math.round((Math.sin(lineIndex / 1.35) + 1) * 28);
      lineNode.style.setProperty("--line-offset", `${offset}px`);
      lineIndex += 1;
      specialText.append(lineNode);
    }
    return specialText;
  }

  const prose = document.createElement("p");
  prose.className = "piece-text piece-text-raw";

  if (!piece.inlineImages || piece.inlineImages.length === 0) {
    appendFormattedText(prose, piece.text);
    return prose;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "piece-text-inline-wrap";

  let remainder = piece.text;
  for (const inlineImage of piece.inlineImages) {
    const markerIndex = remainder.indexOf(inlineImage.after);
    if (markerIndex === -1) {
      continue;
    }

    const endIndex = markerIndex + inlineImage.after.length;
    const textPart = remainder.slice(0, endIndex);
    if (textPart.length > 0) {
      const partNode = document.createElement("p");
      partNode.className = "piece-text piece-text-raw";
      appendFormattedText(partNode, textPart);
      wrapper.append(partNode);
    }

    const imageNode = document.createElement("img");
    imageNode.className = "piece-inline-image";
    imageNode.src = inlineImage.src;
    imageNode.alt = inlineImage.alt ?? "Иллюстрация внутри произведения";
    imageNode.loading = "lazy";
    wrapper.append(imageNode);

    remainder = remainder.slice(endIndex);
  }

  if (remainder.length > 0) {
    const tailNode = document.createElement("p");
    tailNode.className = "piece-text piece-text-raw";
    appendFormattedText(tailNode, remainder);
    wrapper.append(tailNode);
  }

  return wrapper;
};

const renderSection = (pageData) => {
  if (titleNode) {
    titleNode.textContent = pageData.sectionName;
  }

  if (heroTitleNode) {
    heroTitleNode.textContent = pageData.sectionName;
  }

  if (heroImageNode) {
    heroImageNode.src = pageData.heroImage ?? "../pix/rht_logo.png";
    heroImageNode.alt = pageData.heroImageAlt ?? `Раздел ${pageData.sectionName}`;
  }

  if (!feedNode) {
    return;
  }

  feedNode.innerHTML = "";

  for (const piece of pageData.pieces) {
    const article = document.createElement("article");
    article.className = "piece";
    const isImageOnly = piece.text.trim().length === 0 && Boolean(piece.image);
    const isCredits = pageData.layout === "credits";
    if (isImageOnly) {
      article.classList.add("piece-image-only");
    }
    if (isCredits) {
      article.classList.add("piece-credits");
    }

    const main = document.createElement("div");
    main.className = "piece-main";
    if (isCredits) {
      main.classList.add("piece-main-credits");
    }
    if (!isImageOnly) {
      main.append(createPieceTextNode(piece));
    }

    if (piece.image) {
      const image = document.createElement("img");
      image.className = "piece-main-image";
      image.src = piece.image;
      image.alt = piece.imageAlt ?? "Иллюстрация к произведению";
      image.loading = "lazy";
      main.append(image);
    }

    article.append(main);
    if (!isCredits) {
      const side = document.createElement("aside");
      side.className = "piece-side";

      const author = document.createElement("p");
      author.className = "piece-side-value";
      author.textContent = piece.author;

      const title = document.createElement("p");
      title.className = "piece-side-value piece-side-title";
      title.textContent = piece.title;

      side.append(author, title);
      article.append(side);
    }
    feedNode.append(article);
  }
};

let lastY = 0;
let ticking = false;
let shown = false;
const revealOffset = 80;
headerNode?.classList.add("hidden");

const updateHeader = () => {
  const y = window.scrollY;
  const feedTop = feedNode
    ? feedNode.getBoundingClientRect().top + window.scrollY
    : window.innerHeight;
  const showThreshold = Math.max(60, feedTop - revealOffset);

  if (!shown && y >= showThreshold) {
    shown = true;
  }
  if (shown) {
    headerNode?.classList.remove("hidden");
  } else {
    headerNode?.classList.add("hidden");
  }
  lastY = y;
  ticking = false;
};

window.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(updateHeader);
    ticking = true;
  }
});

const loadSectionData = async () => {
  const sectionId = document.body.dataset.sectionId;
  if (!sectionId) {
    throw new Error("Отсутствует идентификатор раздела.");
  }

  const response = await fetch("../content/sections.json");
  if (!response.ok) {
    throw new Error("Не удалось загрузить данные разделов.");
  }

  const data = await response.json();
  const sectionData = data.sections[sectionId];
  if (!sectionData) {
    throw new Error(`Раздел "${sectionId}" не найден.`);
  }

  renderSection(sectionData);
};

loadSectionData().catch((error) => {
  console.error(error);
});
