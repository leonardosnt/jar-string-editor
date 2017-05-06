/*
 *  Copyright (C) 2017 leonardosnt
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along
 *  with this program; if not, write to the Free Software Foundation, Inc.,
 *  51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

const translations = {
  'en': {
    'settings': 'Settings',
    'save_file': 'Save file',
    'select_lang': 'Select language',
    'select_file': 'Select file',
    'select_the_file': 'Select the file (.jar)',
    'select_the_file_label': 'The file will be loaded in your browser, try to not select a huge file.',
    'context': 'Context: {0}',
    'context_help_SendMessage': 'The SendMessage context means that the string will be used as a (chat)message that will be sent to a player/console.',
    'context_help_ItemDisplayName': 'The ItemDisplayName context means that the string will be used as the name of a item.',
    'context_help_HasPermission': 'The HasPermission context means that the string will be used as a permission for something.',
    'context_should_be_modified_no': 'Should not be modified because there\'s a big chance you break something.',
    'context_should_be_modified_yes': 'Can be safely modified.',
    'context_should_be_modified_maybe': 'Should be modified only if you know what you are doing.',
    'misc_options': 'Misc options'
  },
  'pt-BR': {
    'settings': 'Configurações',
    'save_file': 'Salvar arquivo',
    'select_lang': 'Selecionar idioma',
    'select_file': 'Selecionar arquivo',
    'select_the_file': 'Selecione o arquivo (.jar)',
    'select_the_file_label': 'O arquivo será carregado no seu navegador, tente não escolher arquivos muito grandes.',
    'context': 'Contexto: {0}',
    'context_help_SendMessage': 'O contexto SendMessage indica que esta string será enviada para um jogador/console.',
    'context_help_ItemDisplayName': 'O contexto ItemDisplayName indica que esta string será usada como nome de um item.',
    'context_help_HasPermission': 'O contexto HasPermission indica que esta string será usada como permissão para alguma coisa.',
    'context_should_be_modified_yes': 'Pode ser modificada sem problemas.',
    'context_should_be_modified_no': 'Não deve ser modificada pois há uma grande chance de causar problemas.',
    'context_should_be_modified_maybe': 'Não deve ser modificada a menos que saiba o que está fazendo.',
    'misc_options': 'Outras opções'
  }
};

translations['pt'] = translations['pt-BR'];
translations['en-US'] = translations['en'];

export default translations;