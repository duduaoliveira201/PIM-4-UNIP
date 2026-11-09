const form = document.querySelector('#site-form');
const siteUrlInput = document.querySelector('#site-url');
const errorMessage = document.querySelector('#error-message');
const saveButton = document.querySelector('#save-button');

window.brewMasterDesktop.getSiteUrl().then((siteUrl) => {
  if (siteUrl) {
    siteUrlInput.value = siteUrl;
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;
  saveButton.disabled = true;
  saveButton.textContent = 'Conectando...';

  try {
    const result = await window.brewMasterDesktop.saveSiteUrl(siteUrlInput.value);
    if (!result.success) {
      errorMessage.textContent = result.message;
      errorMessage.hidden = false;
    }
  } catch (error) {
    errorMessage.textContent = error instanceof Error
      ? `Não foi possível salvar o endereço: ${error.message}`
      : 'Não foi possível salvar o endereço. Tente novamente.';
    errorMessage.hidden = false;
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Conectar ao BrewMaster';
  }
});
