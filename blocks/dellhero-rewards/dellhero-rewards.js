export default function decorate(block) {
  console.log("aditya 0");
  const row = block.children[0];

  console.log("aditya 1");
  if (!row) return;

  const contentDiv = row.children[0];
  const imageDiv = row.children[1];

  if (!contentDiv || !imageDiv) return;

console.log("aditya 2");
  // Content extraction
  const eyebrow = contentDiv.querySelector('p:nth-of-type(1)');
  const heading = contentDiv.querySelector('h2');
  const description = contentDiv.querySelector('p:nth-of-type(2)');
  const ctaWrapper = contentDiv.querySelector('p:nth-of-type(3)');

  const links = ctaWrapper ? ctaWrapper.querySelectorAll('a') : [];

  const primaryLink = links[0];
  const secondaryLink = links[1];

console.log("aditya 3");
  // Image extraction
  const picture = imageDiv.querySelector('picture');

  // Build final structure
   console.log("aditya 4");
  block.innerHTML = `
    <div>
      <div>
        ${eyebrow ? eyebrow.outerHTML : ''}

        ${heading ? heading.outerHTML : ''}

        ${description ? description.outerHTML : ''}

        <p>
          ${
            primaryLink
              ? `<a href="${primaryLink.href}" title="${primaryLink.textContent.trim()}">
                  ${primaryLink.textContent.trim()}
                </a>`
              : ''
          }

          ${
            secondaryLink
              ? `<a href="${secondaryLink.href}" title="${secondaryLink.textContent.trim()}">
                  ${secondaryLink.textContent.trim()}
                </a>`
              : ''
          }
        </p>
      </div>

      <div>
        ${picture ? picture.outerHTML : ''}
      </div>
    </div>
  `;
  console.log("aditya 5");
}
