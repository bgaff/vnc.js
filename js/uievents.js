var evtTypeMap = [];
var keyMap = [];

keyMap[8]       =       0xFF08;   // BackSpace
keyMap[9]       =       0xFF09;   // TAB
keyMap[13]      =       0xFF0d;  // RETURN
keyMap[27]      =       0xFF1b;   // ESCAPE
keyMap[45]      =       0xFF63;   // INSERT
keyMap[46]      =       0xFFff;   // DELETE
keyMap[36]      =       0xFF50;   // HOME
keyMap[35]      =       0xFF57;   // END
keyMap[33]      =       0xFF55;   // PAGE UP
keyMap[34]      =       0xFF56;   // PAGE DOWN
keyMap[37]      =       0xFF51;   // LEFT
keyMap[38]      =       0xFF52;   // UP
keyMap[39]      =       0xFF53;   // RIGHT
keyMap[40]      =       0xFF54;   // DOWN

keyMap[112]     =       0xFFbe;   // F1
keyMap[113]     =       0xFFbf;   // F2
keyMap[114]     =       0xFFc0;   // F3
keyMap[115]     =       0xFFc1;   // F4
keyMap[116]     =       0xFFc2;   // F5
keyMap[117]     =       0xFFc3;   // F6
keyMap[118]     =       0xFFc4;   // F7
keyMap[119]     =       0xFFc5;   // F8
keyMap[120]     =       0xFFc6;   // F9
keyMap[121]     =       0xFFc7;   // F10
keyMap[122]     =       0xFFc8;   // F11
keyMap[123]     =       0xFFc9;   // F12

keyMap[16]              =       0xFFe1;   // SHIFT (LEFT)
// keyMap[16]   =       0xe2    // SHIFT (RIGHT)
keyMap[17]              =       0xFFe3;   // CONTROL (LEFT)
//keyMap[17]    =       0xe4    // CONTROL (RIGHT)
keyMap[18]              =   0xFFe7;   // ALT (LEFT)
//keyMap[18]    =       0xe8    // ALT (RIGHT)

function parseKeyEvent(e)
{
       var evt = e || window.event;
       var arr = [];

       arr[0] = 4;
       arr[1] = parseDownFlag(e);
       arr[2] = 0;
       arr[3] = 0;
       arr[4] = 0;
       arr[5] = 0;
       arr[6] = readKey(e, 1);
       arr[7] = readKey(e, 0);

   console.log(arr);

   return Base64.encodeIntArr(arr);
}

function parseDownFlag(evt)
{
       if (evt.type == 'keydown')
       {
               return 1;
       } else
       {
               return 0;
       }
}

function readKey(e, i)
{
	   console.log('e=' + e + "i=" + i);
       var k = keyMap[e.keyCode];
       var rst;
       if (k == undefined)
       {
               rst = e.keyCode;
			   var shiftPressed = (window.Event) ? e.modifiers & Event.SHIFT_MASK : e.shiftKey;
				if(rst >= 65 && rst <= 90 && !shiftPressed){
					rst += 32;// "a".toCharCode(0);
			    }
       } else
       {
               rst = k;
       }
   return (rst & (0xFF << (i*8))) >> (i*8);
}

function parseMouseEvent(evt)
{
   var button = evt.which;
   var buttonMask = button == 1 ? 1 : 2
   var arr = [];

   arr[0] = 5;
   arr[1] = buttonMask;
   arr[2] = (evt.x & 0xFF00) >> 8;
   arr[3] = evt.x & 0xFF;
   arr[4] = (evt.y & 0xFF00) >> 8;
   arr[5] = evt.y & 0xFF;

   if (evt.preventDefault)
       evt.preventDefault();
   else
       evt.returnValue = false;

   console.log(arr);

   return Base64.encodeIntArr(arr);
}