import board
import busio
from digitalio import DigitalInOut, Direction, Pull
from adafruit_bus_device.spi_device import SPIDevice


class MFRC522:

    DEBUG = False
    OK = 0
    NOTAGERR = 1
    ERR = 2

    REQIDL = 0x26
    REQALL = 0x52
    AUTHENT1A = 0x60
    AUTHENT1B = 0x61
  
    PICC_ANTICOLL1 = 0x93
    PICC_ANTICOLL2 = 0x95
    PICC_ANTICOLL3 = 0x97
  

    def __init__(self):
        self.rst = DigitalInOut(board.GP0)
        self.rst.direction = Direction.OUTPUT

        self.cs = DigitalInOut(board.GP1)
        self.cs.direction = Direction.OUTPUT

        self.rst.value = 0
        self.cs.value = 1

        self.spi = busio.SPI(clock=board.GP2, MOSI=board.GP3, MISO=board.GP4)
        self.device = SPIDevice(self.spi, self.cs)

        self.rst.value = 1
        self.init()

    def _wreg(self, reg, val):

        with self.device:
            self.spi.write(b'%c' % int(0xff & ((reg << 1) & 0x7e)))
            self.spi.write(b'%c' % int(0xff & val))

    def _rreg(self, reg):

        with self.device:
            self.spi.write(b'%c' % int(0xff & (((reg << 1) & 0x7e) | 0x80)))
            val = bytearray(1)
            self.spi.readinto(val)
            return val[0]

    def _sflags(self, reg, mask):
        self._wreg(reg, self._rreg(reg) | mask)

    def _cflags(self, reg, mask):
        self._wreg(reg, self._rreg(reg) & (~mask))

    def _tocard(self, cmd, send):

        recv = []
        bits = irq_en = wait_irq = n = 0
        stat = self.ERR

        if cmd == 0x0E:
            irq_en = 0x12
            wait_irq = 0x10
        elif cmd == 0x0C:
            irq_en = 0x77
            wait_irq = 0x30

        self._wreg(0x02, irq_en | 0x80)
        self._cflags(0x04, 0x80)
        self._sflags(0x0A, 0x80)
        self._wreg(0x01, 0x00)

        for c in send:
            self._wreg(0x09, c)
        self._wreg(0x01, cmd)

        if cmd == 0x0C:
            self._sflags(0x0D, 0x80)

        i = 2000
        while True:
            n = self._rreg(0x04)
            i -= 1
            if ~((i != 0) and ~(n & 0x01) and ~(n & wait_irq)):
                break

        self._cflags(0x0D, 0x80)

        if i:
            if (self._rreg(0x06) & 0x1B) == 0x00:
                stat = self.OK

                if n & irq_en & 0x01:
                    stat = self.NOTAGERR
                elif cmd == 0x0C:
                    n = self._rreg(0x0A)
                    lbits = self._rreg(0x0C) & 0x07
                    if lbits != 0:
                        bits = (n - 1) * 8 + lbits
                    else:
                        bits = n * 8

                    if n == 0:
                        n = 1
                    elif n > 16:
                        n = 16

                    for _ in range(n):
                        recv.append(self._rreg(0x09))
            else:
                stat = self.ERR

        return stat, recv, bits

    def _crc(self, data):

        self._cflags(0x05, 0x04)
        self._sflags(0x0A, 0x80)

        for c in data:
            self._wreg(0x09, c)

        self._wreg(0x01, 0x03)

        i = 0xFF
        while True:
            n = self._rreg(0x05)
            i -= 1
            if not ((i != 0) and not (n & 0x04)):
                break

        return [self._rreg(0x22), self._rreg(0x21)]

    def init(self):

        self.reset()
        self._wreg(0x2A, 0x8D)
        self._wreg(0x2B, 0x3E)
        self._wreg(0x2D, 30)
        self._wreg(0x2C, 0)
        self._wreg(0x15, 0x40)
        self._wreg(0x11, 0x3D)
        self.antenna_on()

    def reset(self):
        self._wreg(0x01, 0x0F)

    def antenna_on(self, on=True):

        if on and ~(self._rreg(0x14) & 0x03):
            self._sflags(0x14, 0x03)
        else:
            self._cflags(0x14, 0x03)

    def request(self, mode):

        self._wreg(0x0D, 0x07)
        (stat, recv, bits) = self._tocard(0x0C, [mode])

        if (stat != self.OK) | (bits != 0x10):
            stat = self.ERR

        return stat, bits
  
    def anticoll(self,anticolN):

        ser_chk = 0
        ser = [anticolN, 0x20]

        self._wreg(0x0D, 0x00)
        (stat, recv, bits) = self._tocard(0x0C, ser)

        if stat == self.OK:
            if len(recv) == 5:
                for i in range(4):
                    ser_chk = ser_chk ^ recv[i]
                if ser_chk != recv[4]:
                    stat = self.ERR
            else:
                stat = self.ERR

        return stat, recv

    
    def PcdSelect(self, serNum,anticolN):
        backData = []
        buf = []
        buf.append(anticolN)
        buf.append(0x70)
        #i = 0
        ###xorsum=0;
        for i in serNum:
            buf.append(i)
        #while i<5:
        #    buf.append(serNum[i])
        #    i = i + 1
        pOut = self._crc(buf)
        buf.append(pOut[0])
        buf.append(pOut[1])
        (status, backData, backLen) = self._tocard( 0x0C, buf)
        if (status == self.OK) and (backLen == 0x18):
            return  1
        else:
            return 0
    
    
    def SelectTagSN(self):
        valid_uid=[]
        (status,uid)= self.anticoll(self.PICC_ANTICOLL1)
        if status != self.OK:
            return  (self.ERR,[])

        if self.DEBUG:   print("anticol(1) {}".format(uid))
        if self.PcdSelect(uid,self.PICC_ANTICOLL1) == 0:
            return (self.ERR,[])
        if self.DEBUG:   print("pcdSelect(1) {}".format(uid))

        #check if first byte is 0x88
        if uid[0] == 0x88 :
            #ok we have another type of card
            valid_uid.extend(uid[1:4])
            (status,uid)=self.anticoll(self.PICC_ANTICOLL2)
            if status != self.OK:
                return (self.ERR,[])
            if self.DEBUG: print("Anticol(2) {}".format(uid))
            rtn =  self.PcdSelect(uid,self.PICC_ANTICOLL2)
            if self.DEBUG: print("pcdSelect(2) return={} uid={}".format(rtn,uid))
            if rtn == 0:
                return (self.ERR,[])
            if self.DEBUG: print("PcdSelect2() {}".format(uid))
            #now check again if uid[0] is 0x88
            if uid[0] == 0x88 :
                valid_uid.extend(uid[1:4])
                (status , uid) = self.anticoll(self.PICC_ANTICOLL3)
                if status != self.OK:
                    return (self.ERR,[])
                if self.DEBUG: print("Anticol(3) {}".format(uid))
                if self.MFRC522_PcdSelect(uid,self.PICC_ANTICOLL3) == 0:
                    return (self.ERR,[])
                if self.DEBUG: print("PcdSelect(3) {}".format(uid))
        valid_uid.extend(uid[0:5])
        # if we are here than the uid is ok
        # let's remove the last BYTE whic is the XOR sum
        
        return (self.OK , valid_uid[:len(valid_uid)-1])
        #return (self.OK , valid_uid)
    
    
   
       
    

    def auth(self, mode, addr, sect, ser):
        return self._tocard(0x0E, [mode, addr] + sect + ser[:4])[0]
        

    def stop_crypto1(self):
        self._cflags(0x08, 0x08)

    def read(self, addr):

        data = [0x30, addr]
        data += self._crc(data)
        (stat, recv, _) = self._tocard(0x0C, data)
        return recv if stat == self.OK else None

    def write(self, addr, data):

        buf = [0xA0, addr]
        buf += self._crc(buf)
        (stat, recv, bits) = self._tocard(0x0C, buf)

        if not (stat == self.OK) or not (bits == 4) or not ((recv[0] & 0x0F) == 0x0A):
            stat = self.ERR
        else:
            buf = []
            for i in range(16):
                buf.append(data[i])
            buf += self._crc(buf)
            (stat, recv, bits) = self._tocard(0x0C, buf)
            if not (stat == self.OK) or not (bits == 4) or not ((recv[0] & 0x0F) == 0x0A):
                stat = self.ERR

        return stat

    def MFRC522_DumpClassic1K(self, key, uid, Start=0, End=64):
        for i in range(Start,End):
            status = self.auth(self.AUTHENT1A, i, key, uid)
            # Check if authenticated
            print("{:02d}: ".format(i),end="")
            if status == self.OK:                    
                block = self.read(i)
                if block is None:
                    print("-- ")
                else:
                    for value in block:
                        print("{:02X} ".format(value),end="")
                    print("")
            else:
                print("Authentication error")
