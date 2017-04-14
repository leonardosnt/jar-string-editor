const translations = {
  'en': {
    'save_file': 'Save file',
    'select_lang': 'Select language',
    'select_file': 'Select file',
    'select_the_file': 'Select the file (.jar)',
    'select_the_file_label': 'The file will be loaded in your browser, try to not select a huge file.'
  },
  'pt-BR': {
    'save_file': 'Salvar arquivo',
    'select_lang': 'Selecionar idioma',
    'select_file': 'Selecionar arquivo',
    'select_the_file': 'Selecione o arquivo (.jar)',
    'select_the_file_label': 'O arquivo será carregado no seu navegador, tente não escolher arquivos muito grandes.'
  }
};

translations['pt'] = translations['pt-BR'];
translations['en-US'] = translations['en'];

function load (language) {
  if (translations[language] === undefined) {
    return;
  }

  $('[data-i18n-text]').each((idx, ele) => {
    let translationKey = $(ele).attr('data-i18n-text');
    let translation = translations[language][translationKey];

    if (translation) {
      ele.innerText = translation;
    }
  });
}

module.exports = { load };