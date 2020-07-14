/*
 *  Copyright (C) 2017-2020 leonardosnt (leonrdsnt@gmail.com)
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

import mitt from "mitt";
import {
  getAttribute,
  getUtf8String,
  extractMethodInfoConstants,
} from "./util/util";
import {
  JavaClassFileReader,
  Modifier,
  InstructionParser,
  Opcode,
  ConstantType,
} from "java-class-tools";

export default class StringReader {
  constructor() {
    Object.assign(this, mitt());
    this._classReader = new JavaClassFileReader();
    this._stopped = false;
    this._result = [];
  }

  /**
   * Stop the searcher
   */
  stop() {
    this._stopped = true;
  }

  /**
   * Search in all classes from the jar file.
   *
   * @param {JSZip} jar - The jar file
   */
  searchInJar(jar) {
    const classes = jar.filter(path => path.endsWith(".class"));

    /**
     * We process the class files sequentially to use less memory (JSZIP uses a lot of memory)
     * and to be able to "give feedback to the UI" (i.e. display how many class files have been read).
     *
     * It's like "promise series"
     */
    let currentClassIndex = 0;

    const processNext = () => {
      const currentClassFile = classes[currentClassIndex++];

      // If currentClassFile is undefined, we are done
      if (currentClassFile === undefined || this._stopped) {
        this.emit("finish", this._result);
        return;
      }

      // Unzip the class file and search on it
      currentClassFile
        .async("arraybuffer")
        .then(classData => {
          try {
            this.searchInClass(currentClassFile.name, classData);
          } catch (e) {
            console.error(`Failed to search in class "${currentClassFile.name}"`);
            console.error(e);
          }
        })
        .then(() => processNext());

      // Every 100 (currently hardcoded) classes we emit an event
      // to update the UI
      if (currentClassIndex && currentClassIndex % 100 === 0) {
        this.emit("read_count", currentClassIndex);
      }
    };

    // Start processing the classes
    processNext();
  }

  /**
   * Search all strings in a class file.
   *
   * @param {string} fileName - The file name (only used to indentify where the string was found
   *  -- we use this to avoid read the class name)
   * @param {Buffer|ArrayBuffer|Uint8Array} classData - Class data
   */
  searchInClass(fileName, classData) {
    const classFile = this._classReader.read(classData);
    const constantPool = classFile.constant_pool;

    /**
     * Here we store the constantIndex of the strings we already found.
     * It's used because the same string can be referenced many times in different methods.
     */
    const alreadyMappedStrings = new Set();

    const stringsByMethod = classFile.methods
      .filter(method => (method.access_flags & Modifier.ABSTRACT) === 0)
      .map(method => {
        const codeAttribute = getAttribute(classFile, method, "Code");

        if (!codeAttribute || this._isEnumClassInit(classFile, method)) {
          return undefined;
        }

        const instructions = InstructionParser.fromBytecode(codeAttribute.code);

        const stringsInThisMethod = [];

        for (let i = 0; i < instructions.length; i++) {
          const { opcode, operands } = instructions[i];

          // We only want LDC_W & LDC instructions
          if (opcode !== Opcode.LDC && opcode !== Opcode.LDC_W) {
            continue;
          }

          // The index of the constant in constant_pool. If the opcode is LDC_W,
          // the index will be 2 bytes long.
          const constantIndex =
            opcode === Opcode.LDC
              ? operands[0]
              : (operands[0] << 8) | operands[1]; // LDC_W

          const constantEntry = constantPool[constantIndex];

          if (constantEntry.tag !== ConstantType.STRING) {
            continue;
          }

          // Check if this string was already "found" in this file.
          if (alreadyMappedStrings.has(constantIndex)) {
            continue;
          }

          stringsInThisMethod.push({
            constantIndex,
            instruction: instructions[i],
            value: getUtf8String(classFile.constant_pool, constantIndex),
            instructionIndex: i,
          });

          alreadyMappedStrings.add(constantIndex);
        }

        return { method, instructions, strings: stringsInThisMethod };
      })
      .filter(m => m && m.strings.length > 0);

    if (stringsByMethod.length > 0) {
      this._result.push({
        classFile,
        fileName,
        methods: stringsByMethod,
      });
    }
  }

  /**
   * Checks if the method is a class initializer of an Enum.
   *
   * This is used to ignore strings found inside class initializers in Enums
   * because they are usually compiler-generated strings.
   */
  _isEnumClassInit(classFile, method) {
    if ((classFile.access_flags & Modifier.ENUM) === 0) return false;

    const { name, descriptor } = extractMethodInfoConstants(method, classFile.constant_pool);
    return name === "<clinit>" && descriptor === "()V";
  }
}
