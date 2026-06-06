export default function decorate(block) {
  const pretitle = block.children[0]?.textContent?.trim();
  const title = block.children[1]?.textContent?.trim();
  const subtitle = block.children[2]?.textContent?.trim();

  const primaryButtonText = block.children[3]?.textContent?.trim();
  const primaryButtonLink = block.children[4]?.textContent?.trim();

  const secondaryButtonText = block.children[5]?.textContent?.trim();
  const secondaryButtonLink = block.children[6]?.textContent?.trim();

  const image = block.children[7]?.querySelector('img');

  block.innerHTML = '';

  const content = document.createElement('div');
  content.className = 'demo-center-rewards-block__content';

  if (pretitle) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'demo-center-rewards-block__eyebrow';
    eyebrow.textContent = pretitle;
    content.appendChild(eyebrow);
  }

  if (title) {
    const heading = document.createElement('h2');
    heading.className = 'demo-center-rewards-block__title';
    heading.textContent = title;
    content.appendChild(heading);
  }

  if (subtitle) {
    const description = document.createElement('p');
    description.className = 'demo-center-rewards-block__description';
    description.textContent = subtitle;
    content.appendChild(description);
  }

  if (
    primaryButtonText ||
    secondaryButtonText
  ) {
    const actions = document.createElement('div');
    actions.className = 'demo-center-rewards-block__actions';

    if (primaryButtonText && primaryButtonLink) {
      const primaryBtn = document.createElement('a');
      primaryBtn.className = 'demo-center-rewards-block__button';
      primaryBtn.href = primaryButtonLink;
      primaryBtn.textContent = primaryButtonText;

      actions.appendChild(primaryBtn);
    }

    if (secondaryButtonText && secondaryButtonLink) {
      const secondaryBtn = document.createElement('a');
      secondaryBtn.className = 'demo-center-rewards-block__link';

      secondaryBtn.href = secondaryButtonLink;

      secondaryBtn.innerHTML = `
        ${secondaryButtonText}
        <span class="demo-center-rewards-block__arrow">
          →
        </span>
      `;

      actions.appendChild(secondaryBtn);
    }

    content.appendChild(actions);
  }

  block.classList.add('demo-center-rewards-block');

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'demo-center-rewards-block__image';

  if (image) {
    imageWrapper.appendChild(image);
  }

  block.append(content, imageWrapper);
}