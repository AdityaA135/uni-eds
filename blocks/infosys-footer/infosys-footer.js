/* eslint-disable */
// From the Infosys Confluence EDS site: blocks/confluence/footer. Changes: the footer is read
// from this site's footer page, it is built in this block's wrapper, a social link authored as
// a plain link (Universal Editor) gets its icon from its address, and the legal links are the rows
// between the social row and the last row (the copyright), however many there are.
// A leading cell naming the row's item type (imported content) is dropped, the social label is
// taken as text and the logo's picture is taken out of a wrapping paragraph. A footer authored as
// link lists (logo, lists of column, legal and social links, copyright) is first put in the
// source's row order.
import { getMetadata } from '../../scripts/aem.js';

/**
 * A footer authored as lists is rebuilt as the source's rows: [logo], up to three rows of column
 * links, [label] [social links], one row per legal link, [copyright].
 * @param {Element} columns The footer block
 */
function listFooterToRows(columns) {
  if (!columns.querySelector('ul')) return;
  const cell = (content) => {
    const div = document.createElement('div');
    if (typeof content === 'string') div.textContent = content;
    else if (content) div.append(content);
    return div;
  };
  const row = (...cells) => {
    const div = document.createElement('div');
    div.append(...cells);
    return div;
  };
  const isSocial = (a) => /facebook|twitter|x\.com|linkedin/i.test(a.href);
  const lists = [...columns.querySelectorAll('ul')];
  const socialList = lists.find((ul) => [...ul.querySelectorAll('a')].some(isSocial));
  const legalList = lists.find((ul) => ul !== socialList && /terms|privacy|cookie|harbou?r/i.test(ul.textContent));
  const columnLists = lists.filter((ul) => ul !== socialList && ul !== legalList).slice(0, 3);
  const copyright = [...columns.children].map((r) => r.textContent.trim()).find((text) => text.includes('©'));

  const out = [row(cell(columns.querySelector('picture')))];
  columnLists.forEach((ul) => out.push(row(...[...ul.children].map((li) => cell(li.textContent.trim())))));
  while (out.length < 4) out.push(row(cell('')));
  const label = socialList?.previousElementSibling?.textContent.trim() || 'Follow Us';
  const socialLinks = [...(socialList?.querySelectorAll('a') || [])].map((a) => {
    const link = document.createElement('a');
    link.href = a.href;
    link.textContent = a.href;
    return cell(link);
  });
  out.push(row(cell(label), ...socialLinks));
  [...(legalList?.children || [])].forEach((li) => out.push(row(cell(li.textContent.trim()))));
  out.push(row(cell(copyright || '')));
  columns.replaceChildren(...out);
}

export default async function decorate(block) {
  // the page's "footer" metadata, else the footer page in the page's own folder (as the source does)
  const footerPath = new URL(getMetadata('footer') || 'footer', window.location).pathname;

  let main;

  let hostBase = window.location.origin;
  if (footerPath && hostBase) {
    try {
      const resp = await fetch(`${hostBase}${footerPath}.plain.html`);
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

  block.innerHTML = '';

  let footer = block.parentElement;
  footer.classList.add('footer-wrapper', 'footer', 'py-45');

  // Create the wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'wrapper-class';
  wrapper.classList.add('container');
  const firstRowDiv = document.createElement("div");
  firstRowDiv.classList.add("row");
  const firstColDiv = document.createElement("div");
  firstColDiv.classList.add("col-lg-12", 'col-md-12', 'col-sm-12', 'col-xs-12');
  const rowInsideFirstColDiv = document.createElement("div");
  rowInsideFirstColDiv.classList.add("row");
  firstColDiv.append(rowInsideFirstColDiv);

  const col8DivWrap = document.createElement("div");
  col8DivWrap.classList.add('col-lg-8', 'col-md-8', 'col-md-offset-1', 'col-sm-8', 'col-xs-12');
  const rowDivInsideCol8 = document.createElement("div");
  rowDivInsideCol8.classList.add("row");
  // console.log('Wrapper created:', wrapper);

  // Create a grid container for the first 5 rows
  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid-container';
  // console.log('grid created:', gridContainer);

  const rows = main.children[0];
  const columns = rows.children[0];
  // an imported row may start with a cell naming its item type (infosys-footer-...): drop it
  [...columns.children].forEach((row) => {
    if (/^infosys-footer-[a-z]+$/.test(row.firstElementChild?.textContent.trim())) row.firstElementChild.remove();
  });
  listFooterToRows(columns);

  // Helper function to get the link based on content
  function getLink(content) {
    switch (content) {
      case 'Americas':
        return 'https://www.infosys.com/confluence/americas-confluences.html';
      case 'Insights':
        return 'https://www.infosys.com/confluence/insights.html';
      case 'EMEA':
        return 'https://www.infosys.com/confluence/emea-confluences.html';
      case 'Virtual':
        return 'https://www.infosys.com/confluence/virtual.html';
      case 'APAC':
        return 'https://www.infosys.com/confluence/apac-confluences.html';
      case 'Follow Us':
        return ''; // No link for "Follow Us"
      case 'Terms of Use':
        return 'https://www.infosys.com/terms-of-use.html';
      case 'Privacy Statement':
        return 'https://www.infosys.com/privacy-statement.html';
      case 'Cookie Policy':
        return 'https://www.infosys.com/privacy-statement/cookie-policy.html';
      case 'Safe Harbour Provision':
        return 'https://www.infosys.com/safe-harbor-provision.html';
      case 'Trademarks':
        return 'https://www.infosys.com/trademarks.html';
      default:
        return '#';
    }
  }

  // Iterate through container children to create rows 1 to 4
  [...columns.children].forEach((child, rowIndex) => {
    if (rowIndex == 0) {
      const footerLogoWrap = document.createElement('div');
      footerLogoWrap.classList.add('col-lg-3', 'col-md-3', 'col-sm-4', 'col-xs-12', 'mb-30-xs');
      [...child.children].forEach((col, colIndex) => {
        if (rowIndex === 0 && colIndex === 0) {
          // First row, first column: add special class to the picture and make it clickable
          const pictureElement = col.querySelector('picture');
          // the logo may come wrapped in a paragraph: take the picture alone
          if (pictureElement && pictureElement.parentElement !== col) col.replaceChildren(pictureElement);
          if (pictureElement) {
            pictureElement.className = 'special-picture-1-1-1';
            // console.log('Picture element found:', pictureElement);

            const imageElement = pictureElement.querySelector('img');
            if (imageElement) {
              const newImage = document.createElement('img');
              newImage.src = imageElement.src;
              newImage.alt = imageElement.alt || 'Special Image';
              // console.log('New image created:', newImage);

              // Wrap the image in an anchor tag
              const anchor = document.createElement('a');
              anchor.href = 'https://www.infosys.com/confluence.html'; // Replace with your desired URL
              anchor.target = '_self'; // Open in the same tab
              anchor.title = 'Go to Confluence Home';
              anchor.appendChild(newImage);

              // Replace the existing image with the new one wrapped in an anchor tag
              pictureElement.replaceChild(anchor, imageElement);
            }
          }
        }
        footerLogoWrap.innerHTML = col.innerHTML;
        rowInsideFirstColDiv.append(footerLogoWrap);
      });
    }
    if (rowIndex > 0 && rowIndex < 4) {
      const rowContainer = document.createElement('div'); // Define rowContainer within the loop
      rowContainer.classList.add('col-lg-2', 'col-md-2', 'col-sm-2', 'col-xs-4', 'mb-30-xs');
      // console.log(`Row ${rowIndex + 1} created:`, rowContainer);

      // Iterate through columns within the row
      [...child.children].forEach((col, colIndex) => {
        const colContainer = document.createElement('div');
        colContainer.classList.add("mb-10");
        // colContainer.className = `col-${colIndex + 1} col`;
        // console.log(`Row ${rowIndex + 1}, Col ${colIndex + 1} created:`, colContainer);

        colContainer.innerHTML = col.innerHTML;
        // console.log('colContainer contains:', col);

        // Get the text content, determine the link, create an anchor tag if needed
        const content = col.textContent.trim();
        if (content && content !== 'Follow Us') {
          const link = getLink(content);
          if (link) {
            const contentLink = document.createElement('a');
            contentLink.href = link; // Use the link from the switch-case
            contentLink.target = '_self'; // Open in a new tab
            contentLink.textContent = content;
            contentLink.title = content;

            // Clear the existing content and append the link
            colContainer.innerHTML = '';
            colContainer.appendChild(contentLink);
          }
          rowContainer.appendChild(colContainer);
        } else {
          col.innerHTML = content; // Keep "Follow Us" as plain text
          // rowInsideFirstColDiv.appendChild(colContainer);
        }

      });

      // Append the row container to the grid container
      rowInsideFirstColDiv.appendChild(rowContainer);
      // console.log(`Row ${rowIndex + 1} appended to grid container:`, rowContainer);
    }
  });

  // Special handling for the fifth row
  const fifthRow = columns.children[4];
  if (fifthRow) {
    const firstColFifthRow = fifthRow.children[0];
    const remainingColsFifthRow = Array.from(fifthRow.children).slice(1);

    if (firstColFifthRow) {
      const fifthColumnContainer = document.createElement('div');
      fifthColumnContainer.classList.add('col-lg-2', 'col-md-2', 'col-sm-2', 'col-xs-6');
      // console.log('Fifth column container created:', fifthColumnContainer);

      const firstColContainer = document.createElement('label');
      // firstColContainer.className = 'col-1-5';
      firstColContainer.textContent = firstColFifthRow.textContent.trim();
      // console.log('Fifth row, first column added to fifth column:', firstColContainer);

      const iconContainer = document.createElement('div');
      iconContainer.className = 'col-remaining-5';

      // Extract URLs dynamically from the document content

      remainingColsFifthRow.forEach(col => {
        const plainLink = col.querySelector('a');
        if (plainLink && !col.querySelector('.icon')) {
          const iconName = /facebook/.test(plainLink.href) ? 'facebook' : /linkedin/.test(plainLink.href) ? 'linked-in' : 'twitter';
          plainLink.innerHTML = `<span class="icon icon-${iconName}"></span>`;
        }
        const icon = document.createElement('div');
        icon.className = 'footer-icon';
        icon.innerHTML = col.innerHTML;

         // Extract the link from the column if it exists
        const linkElement = col.querySelector('a');
        const dynamicUrl = linkElement ? linkElement.href : '#';

        // Find the icon element and wrap it in an anchor tag
        const iconElement = icon.querySelector('.icon');
        if (iconElement) {
          const anchor = document.createElement('a');

          // Determine the correct URL and tooltip for the icon
          if (iconElement.classList.contains('icon-twitter')) {
            anchor.href = dynamicUrl;
            anchor.title = "Follow us on Twitter";

            // Create the img element and add it to the span 
            const imgElement = document.createElement('img');
            imgElement.src = '	https://www.infosys.com/content/dam/infosys-web/en/global-resource/background-image/twitter.svg'; // Ensure the path is correct 
            imgElement.alt = 'Twitter';
            imgElement.loading = 'lazy';
            iconElement.appendChild(imgElement);
          } else if (iconElement.classList.contains('icon-facebook')) {
            anchor.href = dynamicUrl;
            anchor.title = "Follow us on Facebook";
          } else if (iconElement.classList.contains('icon-linked-in')) {
            anchor.href = dynamicUrl;
            anchor.title = "Follow us on LinkedIn";
          }

          anchor.target = '_blank'; // Open link in a new tab
          anchor.appendChild(iconElement);
          icon.innerHTML = ''; // Clear the icon div
          icon.appendChild(anchor); // Append the anchor with the icon inside
        }

        iconContainer.appendChild(icon);
      });


      fifthColumnContainer.appendChild(firstColContainer);
      fifthColumnContainer.appendChild(iconContainer);
      rowInsideFirstColDiv.appendChild(fifthColumnContainer);
    }
  }


  // console.log('Wrapper contains:', wrapper);


  // Create and append the bottom container for rows 6 to 11
  const bottomContainer = document.createElement('div');
  bottomContainer.classList.add("col-lg-12", 'col-md-12', 'col-sm-12', 'col-xs-12', 'bottom-container');
  const rowDivInsideBottomContainer = document.createElement('div');
  rowDivInsideBottomContainer.classList.add('row');


  // Collect content from rows 6 to 10 and separate with " | "
  let bottomContent = '';
  for (let i = 5; i < columns.children.length - 1; i++) {
    const rowContent = columns.children[i].textContent.trim();
    if (rowContent) {
      bottomContent += `${rowContent}|`; // No space between text and separator
    }
  }
  // Remove the last separator
  bottomContent = bottomContent.slice(0, -1); // Remove the last "|"

  // Create anchor tags for the bottom content
  const bottomContentDiv = document.createElement('div');
  bottomContentDiv.classList.add("col-lg-8", 'col-md-8', 'col-sm-8', 'col-xs-12', 'mt-50', 'bottom-content1');
  const contents = bottomContent.split('|');
  contents.forEach((content, index) => {
    const link = getLink(content.trim());
    if (link) {
      const anchor = document.createElement('a');
      anchor.href = link;
      anchor.target = '_self';
      anchor.textContent = content.trim();
      anchor.title = content.trim();

      bottomContentDiv.appendChild(anchor);
    } else {
      bottomContentDiv.appendChild(document.createTextNode(content.trim()));
    }

    if (index < contents.length - 1) {
      const separator = document.createElement('span');
      separator.className = 'tall-separator';
      separator.textContent = '|';
      bottomContentDiv.appendChild(separator);
    }
  });

  bottomContainer.appendChild(bottomContentDiv);
  // console.log('Bottom content appended to bottom container:', bottomContentDiv);


  const copyrightWrap = document.createElement('div');
  copyrightWrap.classList.add("col-lg-4", 'col-md-4', 'col-sm-4', 'col-xs-12', 'mt-50');

  // Handle the 11th row to align it to the right
  // console.log('10th index content:', columns.children[10]);
  const eleventhRowContent = columns.children[columns.children.length - 1].textContent.trim();
  if (eleventhRowContent) {
    const eleventhRowDiv = document.createElement('div');
    eleventhRowDiv.className = 'eleventh-row';
    eleventhRowDiv.innerHTML = `<p class="m-0">${eleventhRowContent}</p>`;
    copyrightWrap.appendChild(eleventhRowDiv);
    // console.log('11th row appended to bottom container:', eleventhRowDiv);
  }

  rowDivInsideBottomContainer.append(bottomContentDiv);
  rowDivInsideBottomContainer.append(copyrightWrap);
  bottomContainer.append(rowDivInsideBottomContainer);
  // Append the bottom container to the wrapper
  firstRowDiv.append(firstColDiv);
  firstRowDiv.appendChild(bottomContainer);

  // console.log('Bottom container appended to wrapper:', bottomContainer);
  wrapper.append(firstRowDiv);
  // Append the wrapper to the footer
  footer.appendChild(wrapper);
  // console.log('Wrapper appended to footer');

  const dayTabs = document.getElementById('day-tabs');
  if (dayTabs) {
    const stickyOffset = dayTabs.getBoundingClientRect().top + window.scrollY - 70;
    window.addEventListener('scroll', () => {
      if (window.scrollY > stickyOffset) {
        dayTabs.classList.add('sticky');
      } else {
        dayTabs.classList.remove('sticky');
      }
    });
  }
}
