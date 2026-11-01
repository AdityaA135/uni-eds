/* eslint-disable */
// From the Infosys Confluence EDS site: blocks/confluence/header. Changes: the nav is read from
// this site's nav page, and the header is built in this block's wrapper.
import { getMetadata } from '../../scripts/aem.js';
import { createAemElement } from '../../scripts/scripts.js';

export default async function decorate(block) {
  block.innerHTML = "";
  // the page's "nav" metadata, else the nav page in the page's own folder (as the source does)
  const navPath = new URL(getMetadata('nav') || 'nav', window.location).pathname;

 let main;

 let hostBase = window.location.origin;
   if (navPath && hostBase) {
     try {
       const resp = await fetch(`${hostBase}${navPath}.plain.html`);
       if (resp.ok) {
         main = document.createElement('main');
         main.innerHTML = await resp.text();
         // console.log("main inner HTML:", main.innerHTML);
       } else {
         // console.error('Failed to fetch footer content');
         return;
       }
     } catch (error) {
       // console.error('Error fetching footer content:', error);
       return;
     }
   }
  const imgAnchor = main.querySelector("a");
  const picture = main.querySelector("picture");
  
  if (picture && picture.querySelector("img")) {
    picture.querySelector("img").classList.add("logo", "img-responsive");
    picture.querySelector("img").setAttribute("alt", document.title);
  }
  // const header = createAemElement('header', ['header'], null, null);
  const article = createAemElement("article", ["container"], null, null);
  const rowDiv = createAemElement("div", ["row"], null, null);
  const nav = createAemElement(
    "nav",
    ["navbar", "navbar-default", "navbar-fixed-top", "scrollbg-show"],
    null,
    null
  );
  const containerDiv = createAemElement("div", ["container"], null, null);
  const navbarHeader = createAemElement("div", ["navbar-header"], null, null);
  imgAnchor.classList.add("d-block", "navbar-brand");
  imgAnchor.setAttribute("href", imgAnchor.href);
  imgAnchor.setAttribute("title", document.title);
  imgAnchor.innerHTML = '';
  imgAnchor.appendChild(picture);
  navbarHeader.appendChild(imgAnchor);
  containerDiv.appendChild(navbarHeader);
  nav.appendChild(containerDiv);

  const hamburgerMenuRightDiv = createAemElement(
    "div",
    ["hamburger-menu-right"],
    null,
    null
  );
  const hamburgerDiv = createAemElement(
    "div",
    ["hamburger"],
    null,
    "trigger-overlay"
  );
  const overlayDiv = createAemElement(
    "div",
    ["overlay", "overlay-slidedown", "bg-topaz-dark"],
    null,
    null
  );
  const burgerDiv = createIconBar("div", ["burger"], 3, 2);
  hamburgerDiv.appendChild(burgerDiv);
  hamburgerMenuRightDiv.appendChild(hamburgerDiv);
  const btn = createIconBar("button", ["overlay-close"], 3, 1);
  overlayDiv.appendChild(btn);

  const outerDiv = createAemElement(
    "div",
    ["col-lg-8", "col-md-8", "col-sm-8", "col-xs-6"],
    null,
    null
  );
  const overlay = createAemElement("div", ["overlay-mt1", "mb-20"], null, null);
  const anchorClone = imgAnchor.cloneNode(true);
  anchorClone.classList.add("d-block");
  anchorClone.setAttribute("title", "Go to Confluence Home");
  anchorClone.setAttribute("aria-label", "Go to Confluence Home");

  const pictureClone = picture.cloneNode(true);
  pictureClone.classList.add("logo", "logo-inner", "img-responsive");
  pictureClone.setAttribute("alt", "EMEA Confluence 2023");

  anchorClone.innerHTML = "";
  anchorClone.appendChild(pictureClone);
  // console.log('anchorClone',anchorClone);

  overlay.appendChild(anchorClone);
  outerDiv.appendChild(overlay);

  overlayDiv.appendChild(outerDiv);

  const lists = main.querySelectorAll("ul");

  let firstLiOuterDiv, secondListOuterDiv;
  if (lists.length >= 2) {
    firstLiOuterDiv = createFirstListOuterDiv(lists[0]);
    secondListOuterDiv = createSecondListOuterDiv(lists[1]);
  } else if (lists.length === 1) {
    firstLiOuterDiv = createFirstListOuterDiv(lists[0]);
    // Create empty second list if needed
    const emptyUl = document.createElement("ul");
    secondListOuterDiv = createSecondListOuterDiv(emptyUl);
  } else {
    // If no lists exist, create empty ones
    const emptyUl1 = document.createElement("ul");
    const emptyUl2 = document.createElement("ul");
    firstLiOuterDiv = createFirstListOuterDiv(emptyUl1);
    secondListOuterDiv = createSecondListOuterDiv(emptyUl2);
  }
  overlayDiv.appendChild(firstLiOuterDiv);
  overlayDiv.appendChild(secondListOuterDiv);
  hamburgerMenuRightDiv.appendChild(overlayDiv);
  // console.log(hamburgerMenuRightDiv);
  // console.log(nav);
  rowDiv.appendChild(nav);
  rowDiv.appendChild(hamburgerMenuRightDiv);
  article.append(rowDiv);
  // header.append(article);
  // console.log(header);
  // block.append(header);
  const header = block.parentElement;
  block.remove();
  header.classList.add("header-wrapper", "header");
  header.appendChild(article);

  window.addEventListener("scroll", () => {
    if (window.scrollY > 0) {
      nav.classList.add("show-strip");
    } else {
      nav.classList.remove("show-strip");
    }
  });

  burgerDiv.addEventListener("click", () => {
    if (overlayDiv.classList.contains("close")) {
      overlayDiv.classList.remove("close");
    }
    overlayDiv.classList.add("open");
    document.body.classList.add("no-scroll");
  });

  btn.addEventListener("click", () => {
    if (overlayDiv.classList.contains("open")) {
      overlayDiv.classList.remove("open");
    }
    overlayDiv.classList.add("close");
    document.body.classList.remove("no-scroll");
  });

  const scrollToTargets = document.querySelectorAll(".scrollto-target");
  scrollToTargets.forEach(target => {
    target.addEventListener("click", () => {
      if (overlayDiv.classList.contains("open")) {
        overlayDiv.classList.remove("open");
      }
      overlayDiv.classList.add("close");
      document.body.classList.remove("no-scroll");
    });
  });

}

function createIconBar(
  parentElementType,
  parentElementClass,
  numberOfChildren,
  noOfChildClasses
) {
  let parent;
  if (parentElementType === "button") {
    parent = createAemElement(
      parentElementType,
      parentElementClass,
      { type: "button" },
      null
    );
  } else {
    parent = createAemElement(
      parentElementType,
      parentElementClass,
      null,
      null
    );
  }
  if (noOfChildClasses === 2) {
    for (let i = 0; i < numberOfChildren; i++) {
      const iconBar = createAemElement(
        "div",
        ["icon-bar", `icon-bar${i + 1}`],
        null,
        null
      );
      iconBar.innerHTML = "&nbsp;";
      parent.appendChild(iconBar);
    }
  } else {
    for (let i = 0; i < numberOfChildren; i++) {
      const iconBar = createAemElement("div", [`icon-bar${i + 1}`], null, null);
      iconBar.innerHTML = "&nbsp;";
      parent.appendChild(iconBar);
    }
  }
  return parent;
}

function createFirstListOuterDiv(unorderedList) {
  const outerDiv = createAemElement(
    "div",
    ["col-lg-12", "col-md-12", "col-sm-12", "col-xs-12"],
    null,
    null
  );
  const nav = createAemElement("nav", null, null, null);
  unorderedList.classList.add("row", "close-overlay");
  for (let i = 0; i < unorderedList.children.length; i++) {
    const listItem = unorderedList.children[i];
    const span = createAemElement("span", null, null, null);
    span.innerHTML = "&nbsp;";
    listItem.appendChild(span);
    listItem.classList.add("col-lg-6", "col-md-6", "col-sm-6", "col-xs-12");
    const anchor = listItem.querySelector("a");
    anchor.classList.add("scrollto-target");
    
    // Extract hash from existing href or create from text content
    if (!anchor.getAttribute("href")) {
      const aHref = anchor.textContent.trim().toLowerCase().replace(" ", "-");
      anchor.setAttribute("href", `#${aHref}`);
    }
    
    // Ensure title attribute is set
    if (!anchor.getAttribute("title")) {
      anchor.setAttribute("title", anchor.textContent.trim());
    }
    const underlineElement = listItem.querySelector("a").innerText;
    const u = document.createElement('u');
    u.innerText = underlineElement;
    u.classList.add("burgermenu-items");
  }
  outerDiv.appendChild(nav);
  nav.appendChild(unorderedList);
  return outerDiv;
}

function createSecondListOuterDiv(unorderedList) {
  const outerDiv = createAemElement(
    "div",
    ["col-lg-12", "col-md-12", "col-sm-12", "col-xs-12"],
    null,
    null
  );
  const rowDiv = createAemElement("div", ["row"], null, null);
  const menuDiv = createAemElement(
    "div",
    ["col-lg-12", "col-md-12", "col-sm-12", "col-xs-12", "menu-link"],
    null,
    null
  );
  unorderedList.classList.add("close-overlay", "menu-link");
  unorderedList.id = "external_links";
  for (let i = 0; i < unorderedList.children.length; i++) {
    const listItem = unorderedList.children[i];
    const anchor = listItem.querySelector("a");
    anchor.classList.add("archives-list-link");
    
    // Ensure title attribute is set, preserve existing or set from text content
    if (!anchor.getAttribute("title")) {
      if (anchor.textContent.trim() === "Americas Confluence") {
        anchor.setAttribute("title", "EMEA Confluence");
      } else {
        anchor.setAttribute("title", anchor.textContent.trim());
      }
    }
    const underlineElement = listItem.querySelector("a").innerText;
    const u = document.createElement('u');
    u.innerText = underlineElement;
    u.classList.add("burgermenu-items");
  }
  outerDiv.appendChild(rowDiv);
  rowDiv.appendChild(menuDiv);
  menuDiv.appendChild(unorderedList);
  return outerDiv;
}