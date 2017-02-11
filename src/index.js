import { JavaClassFileWriter, JavaClassFileReader, Opcode, ConstantType, InstructionParser } from 'java-class-tools';
import JSZip from 'jszip';
import { TextDecoder, TextEncoder } from 'text-encoding';
import { saveAs } from 'file-saver';

$(function() {
  /**
   * Save information about each string.
   * 
   * {
   *   id: {
   *     ownerClass: string, // Class that owns this string
   *     constantPoolIndex: number // Index in ownerClass's constant_pool
   *   }
   *   ...
   * }
   */
  let stringMap = {};

  /**
   * Maps className to ClassFile object.
   * 
   * {
   *   className: ClassFile,
   *   ...
   * }
   */
  let classFileMap = {};

  let fileName = undefined;
  let jarFile = undefined;
  let id = 0;
  
  $('#save-file').click(e => {
    if (jarFile === undefined) {
      alert("Não ha nada para salvar.");
    } else {
      const textEncoder = new TextEncoder('utf-8');
      const writer = new JavaClassFileWriter();

      $('#string-list')
        .children('.input-field')
        .filter((idx, ele) => $(ele).children('input').val() !== '')
        .map((idx, ele) => {
          const $ele = $(ele);
          const inputVal = $ele.find('input').val();
          const strMapIndex = $ele.attr('data-id');
          const strMapValue = stringMap[strMapIndex];
          const classFile = classFileMap[strMapValue.ownerClass];

          const cpEntry = classFile.constant_pool[strMapValue.constantPoolIndex];
          const encodedStr = textEncoder.encode(inputVal);

          cpEntry.length = encodedStr.length;
          cpEntry.bytes = [];

          // Copy bytes from ArrayBuffer to Array
          encodedStr.forEach(b => cpEntry.bytes.push(b));

          return {
            className: strMapValue.ownerClass,
            classFile: classFile
          };
        })
        .each((idx, val) => {
          const classFileBuf = writer.write(val.classFile);
          jarFile.file(val.className, classFileBuf.buffer);
        });

      // Save modified file
      jarFile.generateAsync({ type: 'blob' })
        .then(function (blob) { 
          saveAs(blob, fileName || "translated.jar");
        });
    }
  })

  $('#select-file').click(e => {
    $('#file-input').click();
  });

  $('#file-input').change(e => {
    const reader = new FileReader();
    const jclassReader = new JavaClassFileReader();
    const textDecoder = new TextDecoder('utf-8');
    const file = e.target.files[0];

    id = 0;
    stringMap = {};
    classFileMap = {};
    fileName = file.name;

    function parseClassContents(file) {
      const classFile = jclassReader.read(file.data);

      classFileMap[file.name] = classFile;
      
      classFile.methods.forEach(md => {
        const codeAttr = md.attributes.filter(attr => {
          const attrName = String.fromCharCode.apply(null, classFile.constant_pool[attr.attribute_name_index].bytes);
          return attrName === "Code";
        })[0];

        if (codeAttr === undefined) return;
        const instructions = InstructionParser.fromBytecode(codeAttr.code);
        
        instructions
          .filter(i => i.opcode == Opcode.LDC)
          .forEach(i => {
            const cpEntry = classFile.constant_pool[i.operands[0]];
            if (cpEntry.tag !== ConstantType.STRING) return;

            const strEntry = classFile.constant_pool[cpEntry.string_index];
            const strValue = textDecoder.decode(new Uint8Array(strEntry.bytes));

            // Append element
            const entryContainer = document.createElement('div');
            const inputLabel = document.createElement('label');
            const input = document.createElement('input');

            stringMap[id] = {
              ownerClass: file.name,
              constantPoolIndex: cpEntry.string_index
            };

            entryContainer.setAttribute('data-id', id++);
            entryContainer.className = 'input-field';
            inputLabel.innerText = strValue;
            input.type = 'text';
            
            entryContainer.appendChild(inputLabel);
            entryContainer.appendChild(input);

            $stringList.append(entryContainer);
          });
      })
    }

    reader.onload = (e) => {
      const data = e.target.result;
      new JSZip()
        .loadAsync(data)
        .then(zip => {
          zip
            .filter(f => f.endsWith('.class'))
            .forEach(f => {
              f.async('arraybuffer').then(data => parseClassContents({
                name: f.name,
                data: data
              }));
            });

          jarFile = zip;
        });
    };

    if (file !== undefined) {
      if (file.type !== 'application/x-java-archive') {
        alert('Você precisa selecionar um arquivo ".jar"');
      } else {
        reader.readAsArrayBuffer(file);
      }
    }
  })
});