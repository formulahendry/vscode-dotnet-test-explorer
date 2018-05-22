//TODO: Improve the binary writer class
export class BinaryWriter {
    predefinedLength;
    byteBuffer;
    endianness;
    encoding;
    length;
    position;

    constructor(endianness?, encoding?, pPredefinedLength?) {

        this.byteBuffer = new Buffer("");

        // Set the endianness
        this.endianness = endianness == 'little' || false;

        // Set the encoding
        this.encoding = encoding || 'ascii';

        // Set the length
        this.length = 0;

        // Set the position to 0
        this.position = 0;

        this.predefinedLength = pPredefinedLength || 0;
    }

    WriteUInt8(value) {
        if (this.predefinedLength > this.length) {
            this.byteBuffer.writeUInt8(value, this.length);
            this.length += 1;
            return;
        }

        var sTempBuffer = new Buffer(1);
        sTempBuffer.writeUInt8(value, 0);
        this.length += 1;
        this.byteBuffer = Buffer.concat([this.byteBuffer, sTempBuffer], this.length);
    }

    WriteBytes(value) {
        if (typeof value == 'string') {
            var sBytesArray = [];

            for (var i = 0; i < value.length; ++i) {
                sBytesArray.push(value.charCodeAt(i));
            }

            value = sBytesArray;
        }

        var sTempBuffer = (value instanceof Buffer) ? value : new Buffer(value);

        if (this.predefinedLength > this.length + sTempBuffer.length - 1) {
            sTempBuffer.copy(this.byteBuffer, this.length, 0, sTempBuffer.length);
            this.length += sTempBuffer.length;
            return;
        }

        this.length += sTempBuffer.length;
        this.byteBuffer = Buffer.concat([this.byteBuffer, sTempBuffer], this.length);
    }


    WriteString(value: string) {
        this.Write7BitEncodedInt(value.length);
        this.WriteBytes(value);
    }

    Write7BitEncodedInt(value: number) {
        // Write out an int 7 bits at a time.  The high bit of the byte,
        // when on, tells reader to continue reading more bytes.
        var v = value;   // support negative numbers
        while (v >= 0x80) {
            this.WriteUInt8((v | 0x80) & 0xFF);
            v >>= 7;
        }
        this.WriteUInt8(v);
    }
}