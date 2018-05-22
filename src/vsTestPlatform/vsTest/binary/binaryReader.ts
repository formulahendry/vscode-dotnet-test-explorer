//TODO: Improve the binary reader class
export class BinaryReader {
    endianness;
    encoding;
    length;
    position;
    byteBuffer: Buffer;

    constructor(buffer?, endianness?, encoding?) {
        // Instantiate the buffer (if needed)
        if (buffer instanceof Buffer) {
            this.byteBuffer = buffer;
        }
        else {
            this.byteBuffer = new Buffer("");
        }
        /* else if (buffer instanceof Array) {
            this.byteBuffer = new Buffer(buffer, encoding);
        } else if(typeof buffer == 'string') {
            this.byteBuffer = new Buffer(buffer, encoding);
        } else {
            throw new Error('Invalid buffer input for BinaryReader (' + typeof p_InputBuffer + ')');
        }*/

        // Set the endianness
        this.endianness = endianness == 'little' || false;

        // Set the encoding
        this.encoding = encoding || 'ascii';

        // Set the length
        this.length = this.byteBuffer.length;

        // Set the position to 0
        this.position = 0;
    }

    append(buffer: Buffer) {
        this.byteBuffer = Buffer.concat([this.byteBuffer, buffer]);
        this.length = this.byteBuffer.length;
    }

    Read7BitEncodedInt(): {size:number, bytesRead:number} {
        // Read out an Int32 7 bits at a time.  The high bit
        // of the byte when on means to continue reading more bytes.
        let count: number = 0;
        let shift: number = 0;
        let increment: number = 0;
        let b: number;
        do {
            // Check for a corrupted stream.  Read a max of 5 bytes.
            // In a future version, add a DataFormatException.
            //if (shift == 5 * 7)  // 5 bytes max per Int32, shift += 7
            //    throw new FormatException(Environment.GetResourceString("Format_Bad7BitInt32"));

            // ReadByte handles end of stream cases for us.
            b = this.ReadUInt8();
            if (b == null) {
                this.position -= increment;
                return null;
            }
            count |= (b & 0x7F) << shift;
            shift += 7;
            increment++;
        } while ((b & 0x80) != 0);
        return {size:count, bytesRead:increment};
    }


    ReadString(): string {
        if(this.canReadLength(2) == false) {
            return null;
        }
        /*if (this.byteBuffer.length < 1 + 1) {
            return null;
        }*/

        //read the UInt8 that is the size of the string
        var s_Val = this.Read7BitEncodedInt();
        if (s_Val == null) {
            return null;
        }

        //stop if the byte buffer length is not sufficient
        if(this.canReadLength(s_Val.size) == false) {
            this.position -= s_Val.bytesRead;
            return null;
        }
        return this.ReadBytes(s_Val.size).toString();
    }

    canReadLength(length: number) {
        if (this.byteBuffer.length - this.position < length) {
            return false;
        }
        return true;
    }

    ReadUInt8() {
        if (this.canReadLength(1) == false) {
            return null;
        }

        var s_Val = this.byteBuffer.readUInt8(this.position);
        ++this.position;

        return s_Val;
    }

    ReadBytes(p_Count) {
        if (p_Count > this.byteBuffer.length) {
            return new Buffer(0);
        }

        var s_Val = this.byteBuffer.slice(this.position, this.position + p_Count);
        this.position += p_Count;
        return s_Val;
    }
}