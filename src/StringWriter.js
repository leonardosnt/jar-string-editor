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

import { stringToUtf8ByteArray } from "utf8-string-bytes";
import { JavaClassFileReader, JavaClassFileWriter } from "java-class-tools";

export default class StringWriter {
  /**
   * (Re)write the strings to a jar file
   *
   * @param {JSZip} jar - The jar file
   * @param {{ fileName: string, value: string, constantIndex: Number }[]} strings - The strings
   * @returns {Promise<Blob>} - A promise of the compressed jar file
   */
  static write(jar, strings) {
    const classWriter = new JavaClassFileWriter();
    const classReader = new JavaClassFileReader();

    // We use this to cache the class files we already read.
    const classFileMap = new Map();
    const filePromises = [];

    for (const { constantIndex, changed, fileName, value } of strings) {
      if (!changed) continue;

      let classFilePromise;

      if (classFileMap.has(fileName)) {
        classFilePromise = classFileMap.get(fileName);
      } else {
        classFilePromise = jar
          .file(fileName)
          .async("arraybuffer")
          .then(buf => classReader.read(buf));
        classFileMap.set(fileName, classFilePromise);
      }

      // After we read the class from the jar file
      // we rewrite the string to it
      classFilePromise.then(classFile => {
        // Convert the string to bytes
        const stringBytes = stringToUtf8ByteArray(value);
        const utf8Entry =
          classFile.constant_pool[
            classFile.constant_pool[constantIndex].string_index
          ];

        // Replace the bytes in the constant_pool
        utf8Entry.length = stringBytes.length;
        utf8Entry.bytes = stringBytes;

        // Write the class file back to the jar
        jar.file(fileName, classWriter.write(classFile).buffer);
      });

      filePromises.push(classFilePromise);
    }

    // We wait all ZipObject#async's promises then we re-compress the jar file
    return Promise.all(filePromises).then(() =>
      jar.generateAsync({ type: "blob", compression: "DEFLATE" })
    );
  }
}
