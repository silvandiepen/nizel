<!-- Example 1: Tabs -->
→foo→baz→→bim


---

<!-- Example 2: Tabs -->
  →foo→baz→→bim


---

<!-- Example 3: Tabs -->
    a→a
    ὐ→a


---

<!-- Example 4: Tabs -->
  - foo

→bar


---

<!-- Example 5: Tabs -->
- foo

→→bar


---

<!-- Example 6: Tabs -->
>→→foo


---

<!-- Example 7: Tabs -->
-→→foo


---

<!-- Example 8: Tabs -->
    foo
→bar


---

<!-- Example 9: Tabs -->
 - foo
   - bar
→ - baz


---

<!-- Example 10: Tabs -->
#→Foo


---

<!-- Example 11: Tabs -->
*→*→*→


---

<!-- Example 12: Backslash escapes -->
\!\"\#\$\%\&\'\(\)\*\+\,\-\.\/\:\;\<\=\>\?\@\[\\\]\^\_\`\{\|\}\~


---

<!-- Example 13: Backslash escapes -->
\→\A\a\ \3\φ\«


---

<!-- Example 14: Backslash escapes -->
\*not emphasized*
\<br/> not a tag
\[not a link](/foo)
\`not code`
1\. not a list
\* not a list
\# not a heading
\[foo]: /url "not a reference"
\&ouml; not a character entity


---

<!-- Example 15: Backslash escapes -->
\\*emphasis*


---

<!-- Example 16: Backslash escapes -->
foo\
bar


---

<!-- Example 17: Backslash escapes -->
`` \[\` ``


---

<!-- Example 18: Backslash escapes -->
    \[\]


---

<!-- Example 19: Backslash escapes -->
~~~
\[\]
~~~


---

<!-- Example 20: Backslash escapes -->
<https://example.com?find=\*>


---

<!-- Example 21: Backslash escapes -->
<a href="/bar\/)">


---

<!-- Example 22: Backslash escapes -->
[foo](/bar\* "ti\*tle")


---

<!-- Example 23: Backslash escapes -->
[foo]

[foo]: /bar\* "ti\*tle"


---

<!-- Example 24: Backslash escapes -->
``` foo\+bar
foo
```


---

<!-- Example 25: Entity and numeric character references -->
&nbsp; &amp; &copy; &AElig; &Dcaron;
&frac34; &HilbertSpace; &DifferentialD;
&ClockwiseContourIntegral; &ngE;


---

<!-- Example 26: Entity and numeric character references -->
&#35; &#1234; &#992; &#0;


---

<!-- Example 27: Entity and numeric character references -->
&#X22; &#XD06; &#xcab;


---

<!-- Example 28: Entity and numeric character references -->
&nbsp &x; &#; &#x;
&#87654321;
&#abcdef0;
&ThisIsNotDefined; &hi?;


---

<!-- Example 29: Entity and numeric character references -->
&copy


---

<!-- Example 30: Entity and numeric character references -->
&MadeUpEntity;


---

<!-- Example 31: Entity and numeric character references -->
<a href="&ouml;&ouml;.html">


---

<!-- Example 32: Entity and numeric character references -->
[foo](/f&ouml;&ouml; "f&ouml;&ouml;")


---

<!-- Example 33: Entity and numeric character references -->
[foo]

[foo]: /f&ouml;&ouml; "f&ouml;&ouml;"


---

<!-- Example 34: Entity and numeric character references -->
``` f&ouml;&ouml;
foo
```


---

<!-- Example 35: Entity and numeric character references -->
`f&ouml;&ouml;`


---

<!-- Example 36: Entity and numeric character references -->
    f&ouml;f&ouml;


---

<!-- Example 37: Entity and numeric character references -->
&#42;foo&#42;
*foo*


---

<!-- Example 38: Entity and numeric character references -->
&#42; foo

* foo


---

<!-- Example 39: Entity and numeric character references -->
foo&#10;&#10;bar


---

<!-- Example 40: Entity and numeric character references -->
&#9;foo


---

<!-- Example 41: Entity and numeric character references -->
[a](url &quot;tit&quot;)


---

<!-- Example 42: Precedence -->
- `one
- two`


---

<!-- Example 43: Thematic breaks -->
***
---
___


---

<!-- Example 44: Thematic breaks -->
+++


---

<!-- Example 45: Thematic breaks -->
===


---

<!-- Example 46: Thematic breaks -->
--
**
__


---

<!-- Example 47: Thematic breaks -->
 ***
  ***
   ***


---

<!-- Example 48: Thematic breaks -->
    ***


---

<!-- Example 49: Thematic breaks -->
Foo
    ***


---

<!-- Example 50: Thematic breaks -->
_____________________________________


---

<!-- Example 51: Thematic breaks -->
 - - -


---

<!-- Example 52: Thematic breaks -->
 **  * ** * ** * **


---

<!-- Example 53: Thematic breaks -->
-     -      -      -


---

<!-- Example 54: Thematic breaks -->
- - - -    


---

<!-- Example 55: Thematic breaks -->
_ _ _ _ a

a------

---a---


---

<!-- Example 56: Thematic breaks -->
 *-*


---

<!-- Example 57: Thematic breaks -->
- foo
***
- bar


---

<!-- Example 58: Thematic breaks -->
Foo
***
bar


---

<!-- Example 59: Thematic breaks -->
Foo
---
bar


---

<!-- Example 60: Thematic breaks -->
* Foo
* * *
* Bar


---

<!-- Example 61: Thematic breaks -->
- Foo
- * * *


---

<!-- Example 62: ATX headings -->
# foo
## foo
### foo
#### foo
##### foo
###### foo


---

<!-- Example 63: ATX headings -->
####### foo


---

<!-- Example 64: ATX headings -->
#5 bolt

#hashtag


---

<!-- Example 65: ATX headings -->
\## foo


---

<!-- Example 66: ATX headings -->
# foo *bar* \*baz\*


---

<!-- Example 67: ATX headings -->
#                  foo                     


---

<!-- Example 68: ATX headings -->
 ### foo
  ## foo
   # foo


---

<!-- Example 69: ATX headings -->
    # foo


---

<!-- Example 70: ATX headings -->
foo
    # bar


---

<!-- Example 71: ATX headings -->
## foo ##
  ###   bar    ###


---

<!-- Example 72: ATX headings -->
# foo ##################################
##### foo ##


---

<!-- Example 73: ATX headings -->
### foo ###     


---

<!-- Example 74: ATX headings -->
### foo ### b


---

<!-- Example 75: ATX headings -->
# foo#


---

<!-- Example 76: ATX headings -->
### foo \###
## foo #\##
# foo \#


---

<!-- Example 77: ATX headings -->
****
## foo
****


---

<!-- Example 78: ATX headings -->
Foo bar
# baz
Bar foo


---

<!-- Example 79: ATX headings -->
## 
#
### ###


---

<!-- Example 80: Setext headings -->
Foo *bar*
=========

Foo *bar*
---------


---

<!-- Example 81: Setext headings -->
Foo *bar
baz*
====


---

<!-- Example 82: Setext headings -->
  Foo *bar
baz*→
====


---

<!-- Example 83: Setext headings -->
Foo
-------------------------

Foo
=


---

<!-- Example 84: Setext headings -->
   Foo
---

  Foo
-----

  Foo
  ===


---

<!-- Example 85: Setext headings -->
    Foo
    ---

    Foo
---


---

<!-- Example 86: Setext headings -->
Foo
   ----      


---

<!-- Example 87: Setext headings -->
Foo
    ---


---

<!-- Example 88: Setext headings -->
Foo
= =

Foo
--- -


---

<!-- Example 89: Setext headings -->
Foo  
-----


---

<!-- Example 90: Setext headings -->
Foo\
----


---

<!-- Example 91: Setext headings -->
`Foo
----
`

<a title="a lot
---
of dashes"/>


---

<!-- Example 92: Setext headings -->
> Foo
---


---

<!-- Example 93: Setext headings -->
> foo
bar
===


---

<!-- Example 94: Setext headings -->
- Foo
---


---

<!-- Example 95: Setext headings -->
Foo
Bar
---


---

<!-- Example 96: Setext headings -->
---
Foo
---
Bar
---
Baz


---

<!-- Example 97: Setext headings -->

====


---

<!-- Example 98: Setext headings -->
---
---


---

<!-- Example 99: Setext headings -->
- foo
-----


---

<!-- Example 100: Setext headings -->
    foo
---


---

<!-- Example 101: Setext headings -->
> foo
-----


---

<!-- Example 102: Setext headings -->
\> foo
------


---

<!-- Example 103: Setext headings -->
Foo

bar
---
baz


---

<!-- Example 104: Setext headings -->
Foo
bar

---

baz


---

<!-- Example 105: Setext headings -->
Foo
bar
* * *
baz


---

<!-- Example 106: Setext headings -->
Foo
bar
\---
baz


---

<!-- Example 107: Indented code blocks -->
    a simple
      indented code block


---

<!-- Example 108: Indented code blocks -->
  - foo

    bar


---

<!-- Example 109: Indented code blocks -->
1.  foo

    - bar


---

<!-- Example 110: Indented code blocks -->
    <a/>
    *hi*

    - one


---

<!-- Example 111: Indented code blocks -->
    chunk1

    chunk2
  
 
 
    chunk3


---

<!-- Example 112: Indented code blocks -->
    chunk1
      
      chunk2


---

<!-- Example 113: Indented code blocks -->
Foo
    bar



---

<!-- Example 114: Indented code blocks -->
    foo
bar


---

<!-- Example 115: Indented code blocks -->
# Heading
    foo
Heading
------
    foo
----


---

<!-- Example 116: Indented code blocks -->
        foo
    bar


---

<!-- Example 117: Indented code blocks -->

    
    foo
    



---

<!-- Example 118: Indented code blocks -->
    foo  


---

<!-- Example 119: Fenced code blocks -->
```
<
 >
```


---

<!-- Example 120: Fenced code blocks -->
~~~
<
 >
~~~


---

<!-- Example 121: Fenced code blocks -->
``
foo
``


---

<!-- Example 122: Fenced code blocks -->
```
aaa
~~~
```


---

<!-- Example 123: Fenced code blocks -->
~~~
aaa
```
~~~


---

<!-- Example 124: Fenced code blocks -->
````
aaa
```
``````


---

<!-- Example 125: Fenced code blocks -->
~~~~
aaa
~~~
~~~~


---

<!-- Example 126: Fenced code blocks -->
```


---

<!-- Example 127: Fenced code blocks -->
`````

```
aaa


---

<!-- Example 128: Fenced code blocks -->
> ```
> aaa

bbb


---

<!-- Example 129: Fenced code blocks -->
```

  
```


---

<!-- Example 130: Fenced code blocks -->
```
```


---

<!-- Example 131: Fenced code blocks -->
 ```
 aaa
aaa
```


---

<!-- Example 132: Fenced code blocks -->
  ```
aaa
  aaa
aaa
  ```


---

<!-- Example 133: Fenced code blocks -->
   ```
   aaa
    aaa
  aaa
   ```


---

<!-- Example 134: Fenced code blocks -->
    ```
    aaa
    ```


---

<!-- Example 135: Fenced code blocks -->
```
aaa
  ```


---

<!-- Example 136: Fenced code blocks -->
   ```
aaa
  ```


---

<!-- Example 137: Fenced code blocks -->
```
aaa
    ```


---

<!-- Example 138: Fenced code blocks -->
``` ```
aaa


---

<!-- Example 139: Fenced code blocks -->
~~~~~~
aaa
~~~ ~~


---

<!-- Example 140: Fenced code blocks -->
foo
```
bar
```
baz


---

<!-- Example 141: Fenced code blocks -->
foo
---
~~~
bar
~~~
# baz


---

<!-- Example 142: Fenced code blocks -->
```ruby
def foo(x)
  return 3
end
```


---

<!-- Example 143: Fenced code blocks -->
~~~~    ruby startline=3 $%@#$
def foo(x)
  return 3
end
~~~~~~~


---

<!-- Example 144: Fenced code blocks -->
````;
````


---

<!-- Example 145: Fenced code blocks -->
``` aa ```
foo


---

<!-- Example 146: Fenced code blocks -->
~~~ aa ``` ~~~
foo
~~~


---

<!-- Example 147: Fenced code blocks -->
```
``` aaa
```


---

<!-- Example 148: HTML blocks -->
<table><tr><td>
<pre>
**Hello**,

_world_.
</pre>
</td></tr></table>


---

<!-- Example 149: HTML blocks -->
<table>
  <tr>
    <td>
           hi
    </td>
  </tr>
</table>

okay.


---

<!-- Example 150: HTML blocks -->
 <div>
  *hello*
         <foo><a>


---

<!-- Example 151: HTML blocks -->
</div>
*foo*


---

<!-- Example 152: HTML blocks -->
<DIV CLASS="foo">

*Markdown*

</DIV>


---

<!-- Example 153: HTML blocks -->
<div id="foo"
  class="bar">
</div>


---

<!-- Example 154: HTML blocks -->
<div id="foo" class="bar
  baz">
</div>


---

<!-- Example 155: HTML blocks -->
<div>
*foo*

*bar*


---

<!-- Example 156: HTML blocks -->
<div id="foo"
*hi*


---

<!-- Example 157: HTML blocks -->
<div class
foo


---

<!-- Example 158: HTML blocks -->
<div *???-&&&-<---
*foo*


---

<!-- Example 159: HTML blocks -->
<div><a href="bar">*foo*</a></div>


---

<!-- Example 160: HTML blocks -->
<table><tr><td>
foo
</td></tr></table>


---

<!-- Example 161: HTML blocks -->
<div></div>
``` c
int x = 33;
```


---

<!-- Example 162: HTML blocks -->
<a href="foo">
*bar*
</a>


---

<!-- Example 163: HTML blocks -->
<Warning>
*bar*
</Warning>


---

<!-- Example 164: HTML blocks -->
<i class="foo">
*bar*
</i>


---

<!-- Example 165: HTML blocks -->
</ins>
*bar*


---

<!-- Example 166: HTML blocks -->
<del>
*foo*
</del>


---

<!-- Example 167: HTML blocks -->
<del>

*foo*

</del>


---

<!-- Example 168: HTML blocks -->
<del>*foo*</del>


---

<!-- Example 169: HTML blocks -->
<pre language="haskell"><code>
import Text.HTML.TagSoup

main :: IO ()
main = print $ parseTags tags
</code></pre>
okay


---

<!-- Example 170: HTML blocks -->
<script type="text/javascript">
// JavaScript example

document.getElementById("demo").innerHTML = "Hello JavaScript!";
</script>
okay


---

<!-- Example 171: HTML blocks -->
<textarea>

*foo*

_bar_

</textarea>


---

<!-- Example 172: HTML blocks -->
<style
  type="text/css">
h1 {color:red;}

p {color:blue;}
</style>
okay


---

<!-- Example 173: HTML blocks -->
<style
  type="text/css">

foo


---

<!-- Example 174: HTML blocks -->
> <div>
> foo

bar


---

<!-- Example 175: HTML blocks -->
- <div>
- foo


---

<!-- Example 176: HTML blocks -->
<style>p{color:red;}</style>
*foo*


---

<!-- Example 177: HTML blocks -->
<!-- foo -->*bar*
*baz*


---

<!-- Example 178: HTML blocks -->
<script>
foo
</script>1. *bar*


---

<!-- Example 179: HTML blocks -->
<!-- Foo

bar
   baz -->
okay


---

<!-- Example 180: HTML blocks -->
<?php

  echo '>';

?>
okay


---

<!-- Example 181: HTML blocks -->
<!DOCTYPE html>


---

<!-- Example 182: HTML blocks -->
<![CDATA[
function matchwo(a,b)
{
  if (a < b && a < 0) then {
    return 1;

  } else {

    return 0;
  }
}
]]>
okay


---

<!-- Example 183: HTML blocks -->
  <!-- foo -->

    <!-- foo -->


---

<!-- Example 184: HTML blocks -->
  <div>

    <div>


---

<!-- Example 185: HTML blocks -->
Foo
<div>
bar
</div>


---

<!-- Example 186: HTML blocks -->
<div>
bar
</div>
*foo*


---

<!-- Example 187: HTML blocks -->
Foo
<a href="bar">
baz


---

<!-- Example 188: HTML blocks -->
<div>

*Emphasized* text.

</div>


---

<!-- Example 189: HTML blocks -->
<div>
*Emphasized* text.
</div>


---

<!-- Example 190: HTML blocks -->
<table>

<tr>

<td>
Hi
</td>

</tr>

</table>


---

<!-- Example 191: HTML blocks -->
<table>

  <tr>

    <td>
      Hi
    </td>

  </tr>

</table>


---

<!-- Example 192: Link reference definitions -->
[foo]: /url "title"

[foo]


---

<!-- Example 193: Link reference definitions -->
   [foo]: 
      /url  
           'the title'  

[foo]


---

<!-- Example 194: Link reference definitions -->
[Foo*bar\]]:my_(url) 'title (with parens)'

[Foo*bar\]]


---

<!-- Example 195: Link reference definitions -->
[Foo bar]:
<my url>
'title'

[Foo bar]


---

<!-- Example 196: Link reference definitions -->
[foo]: /url '
title
line1
line2
'

[foo]


---

<!-- Example 197: Link reference definitions -->
[foo]: /url 'title

with blank line'

[foo]


---

<!-- Example 198: Link reference definitions -->
[foo]:
/url

[foo]


---

<!-- Example 199: Link reference definitions -->
[foo]:

[foo]


---

<!-- Example 200: Link reference definitions -->
[foo]: <>

[foo]


---

<!-- Example 201: Link reference definitions -->
[foo]: <bar>(baz)

[foo]


---

<!-- Example 202: Link reference definitions -->
[foo]: /url\bar\*baz "foo\"bar\baz"

[foo]


---

<!-- Example 203: Link reference definitions -->
[foo]

[foo]: url


---

<!-- Example 204: Link reference definitions -->
[foo]

[foo]: first
[foo]: second


---

<!-- Example 205: Link reference definitions -->
[FOO]: /url

[Foo]


---

<!-- Example 206: Link reference definitions -->
[ΑΓΩ]: /φου

[αγω]


---

<!-- Example 207: Link reference definitions -->
[foo]: /url


---

<!-- Example 208: Link reference definitions -->
[
foo
]: /url
bar


---

<!-- Example 209: Link reference definitions -->
[foo]: /url "title" ok


---

<!-- Example 210: Link reference definitions -->
[foo]: /url
"title" ok


---

<!-- Example 211: Link reference definitions -->
    [foo]: /url "title"

[foo]


---

<!-- Example 212: Link reference definitions -->
```
[foo]: /url
```

[foo]


---

<!-- Example 213: Link reference definitions -->
Foo
[bar]: /baz

[bar]


---

<!-- Example 214: Link reference definitions -->
# [Foo]
[foo]: /url
> bar


---

<!-- Example 215: Link reference definitions -->
[foo]: /url
bar
===
[foo]


---

<!-- Example 216: Link reference definitions -->
[foo]: /url
===
[foo]


---

<!-- Example 217: Link reference definitions -->
[foo]: /foo-url "foo"
[bar]: /bar-url
  "bar"
[baz]: /baz-url

[foo],
[bar],
[baz]


---

<!-- Example 218: Link reference definitions -->
[foo]

> [foo]: /url


---

<!-- Example 219: Paragraphs -->
aaa

bbb


---

<!-- Example 220: Paragraphs -->
aaa
bbb

ccc
ddd


---

<!-- Example 221: Paragraphs -->
aaa


bbb


---

<!-- Example 222: Paragraphs -->
  aaa
 bbb


---

<!-- Example 223: Paragraphs -->
aaa
             bbb
                                       ccc


---

<!-- Example 224: Paragraphs -->
   aaa
bbb


---

<!-- Example 225: Paragraphs -->
    aaa
bbb


---

<!-- Example 226: Paragraphs -->
aaa     
bbb     


---

<!-- Example 227: Blank lines -->
  

aaa
  

# aaa

  


---

<!-- Example 228: Block quotes -->
> # Foo
> bar
> baz


---

<!-- Example 229: Block quotes -->
># Foo
>bar
> baz


---

<!-- Example 230: Block quotes -->
   > # Foo
   > bar
 > baz


---

<!-- Example 231: Block quotes -->
    > # Foo
    > bar
    > baz


---

<!-- Example 232: Block quotes -->
> # Foo
> bar
baz


---

<!-- Example 233: Block quotes -->
> bar
baz
> foo


---

<!-- Example 234: Block quotes -->
> foo
---


---

<!-- Example 235: Block quotes -->
> - foo
- bar


---

<!-- Example 236: Block quotes -->
>     foo
    bar


---

<!-- Example 237: Block quotes -->
> ```
foo
```


---

<!-- Example 238: Block quotes -->
> foo
    - bar


---

<!-- Example 239: Block quotes -->
>


---

<!-- Example 240: Block quotes -->
>
>  
> 


---

<!-- Example 241: Block quotes -->
>
> foo
>  


---

<!-- Example 242: Block quotes -->
> foo

> bar


---

<!-- Example 243: Block quotes -->
> foo
> bar


---

<!-- Example 244: Block quotes -->
> foo
>
> bar


---

<!-- Example 245: Block quotes -->
foo
> bar


---

<!-- Example 246: Block quotes -->
> aaa
***
> bbb


---

<!-- Example 247: Block quotes -->
> bar
baz


---

<!-- Example 248: Block quotes -->
> bar

baz


---

<!-- Example 249: Block quotes -->
> bar
>
baz


---

<!-- Example 250: Block quotes -->
> > > foo
bar


---

<!-- Example 251: Block quotes -->
>>> foo
> bar
>>baz


---

<!-- Example 252: Block quotes -->
>     code

>    not code


---

<!-- Example 253: List items -->
A paragraph
with two lines.

    indented code

> A block quote.


---

<!-- Example 254: List items -->
1.  A paragraph
    with two lines.

        indented code

    > A block quote.


---

<!-- Example 255: List items -->
- one

 two


---

<!-- Example 256: List items -->
- one

  two


---

<!-- Example 257: List items -->
 -    one

     two


---

<!-- Example 258: List items -->
 -    one

      two


---

<!-- Example 259: List items -->
   > > 1.  one
>>
>>     two


---

<!-- Example 260: List items -->
>>- one
>>
  >  > two


---

<!-- Example 261: List items -->
-one

2.two


---

<!-- Example 262: List items -->
- foo


  bar


---

<!-- Example 263: List items -->
1.  foo

    ```
    bar
    ```

    baz

    > bam


---

<!-- Example 264: List items -->
- Foo

      bar


      baz


---

<!-- Example 265: List items -->
123456789. ok


---

<!-- Example 266: List items -->
1234567890. not ok


---

<!-- Example 267: List items -->
0. ok


---

<!-- Example 268: List items -->
003. ok


---

<!-- Example 269: List items -->
-1. not ok


---

<!-- Example 270: List items -->
- foo

      bar


---

<!-- Example 271: List items -->
  10.  foo

           bar


---

<!-- Example 272: List items -->
    indented code

paragraph

    more code


---

<!-- Example 273: List items -->
1.     indented code

   paragraph

       more code


---

<!-- Example 274: List items -->
1.      indented code

   paragraph

       more code


---

<!-- Example 275: List items -->
   foo

bar


---

<!-- Example 276: List items -->
-    foo

  bar


---

<!-- Example 277: List items -->
-  foo

   bar


---

<!-- Example 278: List items -->
-
  foo
-
  ```
  bar
  ```
-
      baz


---

<!-- Example 279: List items -->
-   
  foo


---

<!-- Example 280: List items -->
-

  foo


---

<!-- Example 281: List items -->
- foo
-
- bar


---

<!-- Example 282: List items -->
- foo
-   
- bar


---

<!-- Example 283: List items -->
1. foo
2.
3. bar


---

<!-- Example 284: List items -->
*


---

<!-- Example 285: List items -->
foo
*

foo
1.


---

<!-- Example 286: List items -->
 1.  A paragraph
     with two lines.

         indented code

     > A block quote.


---

<!-- Example 287: List items -->
  1.  A paragraph
      with two lines.

          indented code

      > A block quote.


---

<!-- Example 288: List items -->
   1.  A paragraph
       with two lines.

           indented code

       > A block quote.


---

<!-- Example 289: List items -->
    1.  A paragraph
        with two lines.

            indented code

        > A block quote.


---

<!-- Example 290: List items -->
  1.  A paragraph
with two lines.

          indented code

      > A block quote.


---

<!-- Example 291: List items -->
  1.  A paragraph
    with two lines.


---

<!-- Example 292: List items -->
> 1. > Blockquote
continued here.


---

<!-- Example 293: List items -->
> 1. > Blockquote
> continued here.


---

<!-- Example 294: List items -->
- foo
  - bar
    - baz
      - boo


---

<!-- Example 295: List items -->
- foo
 - bar
  - baz
   - boo


---

<!-- Example 296: List items -->
10) foo
    - bar


---

<!-- Example 297: List items -->
10) foo
   - bar


---

<!-- Example 298: List items -->
- - foo


---

<!-- Example 299: List items -->
1. - 2. foo


---

<!-- Example 300: List items -->
- # Foo
- Bar
  ---
  baz


---

<!-- Example 301: Lists -->
- foo
- bar
+ baz


---

<!-- Example 302: Lists -->
1. foo
2. bar
3) baz


---

<!-- Example 303: Lists -->
Foo
- bar
- baz


---

<!-- Example 304: Lists -->
The number of windows in my house is
14.  The number of doors is 6.


---

<!-- Example 305: Lists -->
The number of windows in my house is
1.  The number of doors is 6.


---

<!-- Example 306: Lists -->
- foo

- bar


- baz


---

<!-- Example 307: Lists -->
- foo
  - bar
    - baz


      bim


---

<!-- Example 308: Lists -->
- foo
- bar

<!-- -->

- baz
- bim


---

<!-- Example 309: Lists -->
-   foo

    notcode

-   foo

<!-- -->

    code


---

<!-- Example 310: Lists -->
- a
 - b
  - c
   - d
  - e
 - f
- g


---

<!-- Example 311: Lists -->
1. a

  2. b

   3. c


---

<!-- Example 312: Lists -->
- a
 - b
  - c
   - d
    - e


---

<!-- Example 313: Lists -->
1. a

  2. b

    3. c


---

<!-- Example 314: Lists -->
- a
- b

- c


---

<!-- Example 315: Lists -->
* a
*

* c


---

<!-- Example 316: Lists -->
- a
- b

  c
- d


---

<!-- Example 317: Lists -->
- a
- b

  [ref]: /url
- d


---

<!-- Example 318: Lists -->
- a
- ```
  b


  ```
- c


---

<!-- Example 319: Lists -->
- a
  - b

    c
- d


---

<!-- Example 320: Lists -->
* a
  > b
  >
* c


---

<!-- Example 321: Lists -->
- a
  > b
  ```
  c
  ```
- d


---

<!-- Example 322: Lists -->
- a


---

<!-- Example 323: Lists -->
- a
  - b


---

<!-- Example 324: Lists -->
1. ```
   foo
   ```

   bar


---

<!-- Example 325: Lists -->
* foo
  * bar

  baz


---

<!-- Example 326: Lists -->
- a
  - b
  - c

- d
  - e
  - f


---

<!-- Example 327: Inlines -->
`hi`lo`


---

<!-- Example 328: Code spans -->
`foo`


---

<!-- Example 329: Code spans -->
`` foo ` bar ``


---

<!-- Example 330: Code spans -->
` `` `


---

<!-- Example 331: Code spans -->
`  ``  `


---

<!-- Example 332: Code spans -->
` a`


---

<!-- Example 333: Code spans -->
` b `


---

<!-- Example 334: Code spans -->
` `
`  `


---

<!-- Example 335: Code spans -->
``
foo
bar  
baz
``


---

<!-- Example 336: Code spans -->
``
foo 
``


---

<!-- Example 337: Code spans -->
`foo   bar 
baz`


---

<!-- Example 338: Code spans -->
`foo\`bar`


---

<!-- Example 339: Code spans -->
``foo`bar``


---

<!-- Example 340: Code spans -->
` foo `` bar `


---

<!-- Example 341: Code spans -->
*foo`*`


---

<!-- Example 342: Code spans -->
[not a `link](/foo`)


---

<!-- Example 343: Code spans -->
`<a href="`">`


---

<!-- Example 344: Code spans -->
<a href="`">`


---

<!-- Example 345: Code spans -->
`<https://foo.bar.`baz>`


---

<!-- Example 346: Code spans -->
<https://foo.bar.`baz>`


---

<!-- Example 347: Code spans -->
```foo``


---

<!-- Example 348: Code spans -->
`foo


---

<!-- Example 349: Code spans -->
`foo``bar``


---

<!-- Example 350: Emphasis and strong emphasis -->
*foo bar*


---

<!-- Example 351: Emphasis and strong emphasis -->
a * foo bar*


---

<!-- Example 352: Emphasis and strong emphasis -->
a*"foo"*


---

<!-- Example 353: Emphasis and strong emphasis -->
* a *


---

<!-- Example 354: Emphasis and strong emphasis -->
*$*alpha.

*£*bravo.

*€*charlie.


---

<!-- Example 355: Emphasis and strong emphasis -->
foo*bar*


---

<!-- Example 356: Emphasis and strong emphasis -->
5*6*78


---

<!-- Example 357: Emphasis and strong emphasis -->
_foo bar_


---

<!-- Example 358: Emphasis and strong emphasis -->
_ foo bar_


---

<!-- Example 359: Emphasis and strong emphasis -->
a_"foo"_


---

<!-- Example 360: Emphasis and strong emphasis -->
foo_bar_


---

<!-- Example 361: Emphasis and strong emphasis -->
5_6_78


---

<!-- Example 362: Emphasis and strong emphasis -->
пристаням_стремятся_


---

<!-- Example 363: Emphasis and strong emphasis -->
aa_"bb"_cc


---

<!-- Example 364: Emphasis and strong emphasis -->
foo-_(bar)_


---

<!-- Example 365: Emphasis and strong emphasis -->
_foo*


---

<!-- Example 366: Emphasis and strong emphasis -->
*foo bar *


---

<!-- Example 367: Emphasis and strong emphasis -->
*foo bar
*


---

<!-- Example 368: Emphasis and strong emphasis -->
*(*foo)


---

<!-- Example 369: Emphasis and strong emphasis -->
*(*foo*)*


---

<!-- Example 370: Emphasis and strong emphasis -->
*foo*bar


---

<!-- Example 371: Emphasis and strong emphasis -->
_foo bar _


---

<!-- Example 372: Emphasis and strong emphasis -->
_(_foo)


---

<!-- Example 373: Emphasis and strong emphasis -->
_(_foo_)_


---

<!-- Example 374: Emphasis and strong emphasis -->
_foo_bar


---

<!-- Example 375: Emphasis and strong emphasis -->
_пристаням_стремятся


---

<!-- Example 376: Emphasis and strong emphasis -->
_foo_bar_baz_


---

<!-- Example 377: Emphasis and strong emphasis -->
_(bar)_.


---

<!-- Example 378: Emphasis and strong emphasis -->
**foo bar**


---

<!-- Example 379: Emphasis and strong emphasis -->
** foo bar**


---

<!-- Example 380: Emphasis and strong emphasis -->
a**"foo"**


---

<!-- Example 381: Emphasis and strong emphasis -->
foo**bar**


---

<!-- Example 382: Emphasis and strong emphasis -->
__foo bar__


---

<!-- Example 383: Emphasis and strong emphasis -->
__ foo bar__


---

<!-- Example 384: Emphasis and strong emphasis -->
__
foo bar__


---

<!-- Example 385: Emphasis and strong emphasis -->
a__"foo"__


---

<!-- Example 386: Emphasis and strong emphasis -->
foo__bar__


---

<!-- Example 387: Emphasis and strong emphasis -->
5__6__78


---

<!-- Example 388: Emphasis and strong emphasis -->
пристаням__стремятся__


---

<!-- Example 389: Emphasis and strong emphasis -->
__foo, __bar__, baz__


---

<!-- Example 390: Emphasis and strong emphasis -->
foo-__(bar)__


---

<!-- Example 391: Emphasis and strong emphasis -->
**foo bar **


---

<!-- Example 392: Emphasis and strong emphasis -->
**(**foo)


---

<!-- Example 393: Emphasis and strong emphasis -->
*(**foo**)*


---

<!-- Example 394: Emphasis and strong emphasis -->
**Gomphocarpus (*Gomphocarpus physocarpus*, syn.
*Asclepias physocarpa*)**


---

<!-- Example 395: Emphasis and strong emphasis -->
**foo "*bar*" foo**


---

<!-- Example 396: Emphasis and strong emphasis -->
**foo**bar


---

<!-- Example 397: Emphasis and strong emphasis -->
__foo bar __


---

<!-- Example 398: Emphasis and strong emphasis -->
__(__foo)


---

<!-- Example 399: Emphasis and strong emphasis -->
_(__foo__)_


---

<!-- Example 400: Emphasis and strong emphasis -->
__foo__bar


---

<!-- Example 401: Emphasis and strong emphasis -->
__пристаням__стремятся


---

<!-- Example 402: Emphasis and strong emphasis -->
__foo__bar__baz__


---

<!-- Example 403: Emphasis and strong emphasis -->
__(bar)__.


---

<!-- Example 404: Emphasis and strong emphasis -->
*foo [bar](/url)*


---

<!-- Example 405: Emphasis and strong emphasis -->
*foo
bar*


---

<!-- Example 406: Emphasis and strong emphasis -->
_foo __bar__ baz_


---

<!-- Example 407: Emphasis and strong emphasis -->
_foo _bar_ baz_


---

<!-- Example 408: Emphasis and strong emphasis -->
__foo_ bar_


---

<!-- Example 409: Emphasis and strong emphasis -->
*foo *bar**


---

<!-- Example 410: Emphasis and strong emphasis -->
*foo **bar** baz*


---

<!-- Example 411: Emphasis and strong emphasis -->
*foo**bar**baz*


---

<!-- Example 412: Emphasis and strong emphasis -->
*foo**bar*


---

<!-- Example 413: Emphasis and strong emphasis -->
***foo** bar*


---

<!-- Example 414: Emphasis and strong emphasis -->
*foo **bar***


---

<!-- Example 415: Emphasis and strong emphasis -->
*foo**bar***


---

<!-- Example 416: Emphasis and strong emphasis -->
foo***bar***baz


---

<!-- Example 417: Emphasis and strong emphasis -->
foo******bar*********baz


---

<!-- Example 418: Emphasis and strong emphasis -->
*foo **bar *baz* bim** bop*


---

<!-- Example 419: Emphasis and strong emphasis -->
*foo [*bar*](/url)*


---

<!-- Example 420: Emphasis and strong emphasis -->
** is not an empty emphasis


---

<!-- Example 421: Emphasis and strong emphasis -->
**** is not an empty strong emphasis


---

<!-- Example 422: Emphasis and strong emphasis -->
**foo [bar](/url)**


---

<!-- Example 423: Emphasis and strong emphasis -->
**foo
bar**


---

<!-- Example 424: Emphasis and strong emphasis -->
__foo _bar_ baz__


---

<!-- Example 425: Emphasis and strong emphasis -->
__foo __bar__ baz__


---

<!-- Example 426: Emphasis and strong emphasis -->
____foo__ bar__


---

<!-- Example 427: Emphasis and strong emphasis -->
**foo **bar****


---

<!-- Example 428: Emphasis and strong emphasis -->
**foo *bar* baz**


---

<!-- Example 429: Emphasis and strong emphasis -->
**foo*bar*baz**


---

<!-- Example 430: Emphasis and strong emphasis -->
***foo* bar**


---

<!-- Example 431: Emphasis and strong emphasis -->
**foo *bar***


---

<!-- Example 432: Emphasis and strong emphasis -->
**foo *bar **baz**
bim* bop**


---

<!-- Example 433: Emphasis and strong emphasis -->
**foo [*bar*](/url)**


---

<!-- Example 434: Emphasis and strong emphasis -->
__ is not an empty emphasis


---

<!-- Example 435: Emphasis and strong emphasis -->
____ is not an empty strong emphasis


---

<!-- Example 436: Emphasis and strong emphasis -->
foo ***


---

<!-- Example 437: Emphasis and strong emphasis -->
foo *\**


---

<!-- Example 438: Emphasis and strong emphasis -->
foo *_*


---

<!-- Example 439: Emphasis and strong emphasis -->
foo *****


---

<!-- Example 440: Emphasis and strong emphasis -->
foo **\***


---

<!-- Example 441: Emphasis and strong emphasis -->
foo **_**


---

<!-- Example 442: Emphasis and strong emphasis -->
**foo*


---

<!-- Example 443: Emphasis and strong emphasis -->
*foo**


---

<!-- Example 444: Emphasis and strong emphasis -->
***foo**


---

<!-- Example 445: Emphasis and strong emphasis -->
****foo*


---

<!-- Example 446: Emphasis and strong emphasis -->
**foo***


---

<!-- Example 447: Emphasis and strong emphasis -->
*foo****


---

<!-- Example 448: Emphasis and strong emphasis -->
foo ___


---

<!-- Example 449: Emphasis and strong emphasis -->
foo _\__


---

<!-- Example 450: Emphasis and strong emphasis -->
foo _*_


---

<!-- Example 451: Emphasis and strong emphasis -->
foo _____


---

<!-- Example 452: Emphasis and strong emphasis -->
foo __\___


---

<!-- Example 453: Emphasis and strong emphasis -->
foo __*__


---

<!-- Example 454: Emphasis and strong emphasis -->
__foo_


---

<!-- Example 455: Emphasis and strong emphasis -->
_foo__


---

<!-- Example 456: Emphasis and strong emphasis -->
___foo__


---

<!-- Example 457: Emphasis and strong emphasis -->
____foo_


---

<!-- Example 458: Emphasis and strong emphasis -->
__foo___


---

<!-- Example 459: Emphasis and strong emphasis -->
_foo____


---

<!-- Example 460: Emphasis and strong emphasis -->
**foo**


---

<!-- Example 461: Emphasis and strong emphasis -->
*_foo_*


---

<!-- Example 462: Emphasis and strong emphasis -->
__foo__


---

<!-- Example 463: Emphasis and strong emphasis -->
_*foo*_


---

<!-- Example 464: Emphasis and strong emphasis -->
****foo****


---

<!-- Example 465: Emphasis and strong emphasis -->
____foo____


---

<!-- Example 466: Emphasis and strong emphasis -->
******foo******


---

<!-- Example 467: Emphasis and strong emphasis -->
***foo***


---

<!-- Example 468: Emphasis and strong emphasis -->
_____foo_____


---

<!-- Example 469: Emphasis and strong emphasis -->
*foo _bar* baz_


---

<!-- Example 470: Emphasis and strong emphasis -->
*foo __bar *baz bim__ bam*


---

<!-- Example 471: Emphasis and strong emphasis -->
**foo **bar baz**


---

<!-- Example 472: Emphasis and strong emphasis -->
*foo *bar baz*


---

<!-- Example 473: Emphasis and strong emphasis -->
*[bar*](/url)


---

<!-- Example 474: Emphasis and strong emphasis -->
_foo [bar_](/url)


---

<!-- Example 475: Emphasis and strong emphasis -->
*<img src="foo" title="*"/>


---

<!-- Example 476: Emphasis and strong emphasis -->
**<a href="**">


---

<!-- Example 477: Emphasis and strong emphasis -->
__<a href="__">


---

<!-- Example 478: Emphasis and strong emphasis -->
*a `*`*


---

<!-- Example 479: Emphasis and strong emphasis -->
_a `_`_


---

<!-- Example 480: Emphasis and strong emphasis -->
**a<https://foo.bar/?q=**>


---

<!-- Example 481: Emphasis and strong emphasis -->
__a<https://foo.bar/?q=__>


---

<!-- Example 482: Links -->
[link](/uri "title")


---

<!-- Example 483: Links -->
[link](/uri)


---

<!-- Example 484: Links -->
[](./target.md)


---

<!-- Example 485: Links -->
[link]()


---

<!-- Example 486: Links -->
[link](<>)


---

<!-- Example 487: Links -->
[]()


---

<!-- Example 488: Links -->
[link](/my uri)


---

<!-- Example 489: Links -->
[link](</my uri>)


---

<!-- Example 490: Links -->
[link](foo
bar)


---

<!-- Example 491: Links -->
[link](<foo
bar>)


---

<!-- Example 492: Links -->
[a](<b)c>)


---

<!-- Example 493: Links -->
[link](<foo\>)


---

<!-- Example 494: Links -->
[a](<b)c
[a](<b)c>
[a](<b>c)


---

<!-- Example 495: Links -->
[link](\(foo\))


---

<!-- Example 496: Links -->
[link](foo(and(bar)))


---

<!-- Example 497: Links -->
[link](foo(and(bar))


---

<!-- Example 498: Links -->
[link](foo\(and\(bar\))


---

<!-- Example 499: Links -->
[link](<foo(and(bar)>)


---

<!-- Example 500: Links -->
[link](foo\)\:)


---

<!-- Example 501: Links -->
[link](#fragment)

[link](https://example.com#fragment)

[link](https://example.com?foo=3#frag)


---

<!-- Example 502: Links -->
[link](foo\bar)


---

<!-- Example 503: Links -->
[link](foo%20b&auml;)


---

<!-- Example 504: Links -->
[link]("title")


---

<!-- Example 505: Links -->
[link](/url "title")
[link](/url 'title')
[link](/url (title))


---

<!-- Example 506: Links -->
[link](/url "title \"&quot;")


---

<!-- Example 507: Links -->
[link](/url "title")


---

<!-- Example 508: Links -->
[link](/url "title "and" title")


---

<!-- Example 509: Links -->
[link](/url 'title "and" title')


---

<!-- Example 510: Links -->
[link](   /uri
  "title"  )


---

<!-- Example 511: Links -->
[link] (/uri)


---

<!-- Example 512: Links -->
[link [foo [bar]]](/uri)


---

<!-- Example 513: Links -->
[link] bar](/uri)


---

<!-- Example 514: Links -->
[link [bar](/uri)


---

<!-- Example 515: Links -->
[link \[bar](/uri)


---

<!-- Example 516: Links -->
[link *foo **bar** `#`*](/uri)


---

<!-- Example 517: Links -->
[![moon](moon.jpg)](/uri)


---

<!-- Example 518: Links -->
[foo [bar](/uri)](/uri)


---

<!-- Example 519: Links -->
[foo *[bar [baz](/uri)](/uri)*](/uri)


---

<!-- Example 520: Links -->
![[[foo](uri1)](uri2)](uri3)


---

<!-- Example 521: Links -->
*[foo*](/uri)


---

<!-- Example 522: Links -->
[foo *bar](baz*)


---

<!-- Example 523: Links -->
*foo [bar* baz]


---

<!-- Example 524: Links -->
[foo <bar attr="](baz)">


---

<!-- Example 525: Links -->
[foo`](/uri)`


---

<!-- Example 526: Links -->
[foo<https://example.com/?search=](uri)>


---

<!-- Example 527: Links -->
[foo][bar]

[bar]: /url "title"


---

<!-- Example 528: Links -->
[link [foo [bar]]][ref]

[ref]: /uri


---

<!-- Example 529: Links -->
[link \[bar][ref]

[ref]: /uri


---

<!-- Example 530: Links -->
[link *foo **bar** `#`*][ref]

[ref]: /uri


---

<!-- Example 531: Links -->
[![moon](moon.jpg)][ref]

[ref]: /uri


---

<!-- Example 532: Links -->
[foo [bar](/uri)][ref]

[ref]: /uri


---

<!-- Example 533: Links -->
[foo *bar [baz][ref]*][ref]

[ref]: /uri


---

<!-- Example 534: Links -->
*[foo*][ref]

[ref]: /uri


---

<!-- Example 535: Links -->
[foo *bar][ref]*

[ref]: /uri


---

<!-- Example 536: Links -->
[foo <bar attr="][ref]">

[ref]: /uri


---

<!-- Example 537: Links -->
[foo`][ref]`

[ref]: /uri


---

<!-- Example 538: Links -->
[foo<https://example.com/?search=][ref]>

[ref]: /uri


---

<!-- Example 539: Links -->
[foo][BaR]

[bar]: /url "title"


---

<!-- Example 540: Links -->
[ẞ]

[SS]: /url


---

<!-- Example 541: Links -->
[Foo
  bar]: /url

[Baz][Foo bar]


---

<!-- Example 542: Links -->
[foo] [bar]

[bar]: /url "title"


---

<!-- Example 543: Links -->
[foo]
[bar]

[bar]: /url "title"


---

<!-- Example 544: Links -->
[foo]: /url1

[foo]: /url2

[bar][foo]


---

<!-- Example 545: Links -->
[bar][foo\!]

[foo!]: /url


---

<!-- Example 546: Links -->
[foo][ref[]

[ref[]: /uri


---

<!-- Example 547: Links -->
[foo][ref[bar]]

[ref[bar]]: /uri


---

<!-- Example 548: Links -->
[[[foo]]]

[[[foo]]]: /url


---

<!-- Example 549: Links -->
[foo][ref\[]

[ref\[]: /uri


---

<!-- Example 550: Links -->
[bar\\]: /uri

[bar\\]


---

<!-- Example 551: Links -->
[]

[]: /uri


---

<!-- Example 552: Links -->
[
 ]

[
 ]: /uri


---

<!-- Example 553: Links -->
[foo][]

[foo]: /url "title"


---

<!-- Example 554: Links -->
[*foo* bar][]

[*foo* bar]: /url "title"


---

<!-- Example 555: Links -->
[Foo][]

[foo]: /url "title"


---

<!-- Example 556: Links -->
[foo] 
[]

[foo]: /url "title"


---

<!-- Example 557: Links -->
[foo]

[foo]: /url "title"


---

<!-- Example 558: Links -->
[*foo* bar]

[*foo* bar]: /url "title"


---

<!-- Example 559: Links -->
[[*foo* bar]]

[*foo* bar]: /url "title"


---

<!-- Example 560: Links -->
[[bar [foo]

[foo]: /url


---

<!-- Example 561: Links -->
[Foo]

[foo]: /url "title"


---

<!-- Example 562: Links -->
[foo] bar

[foo]: /url


---

<!-- Example 563: Links -->
\[foo]

[foo]: /url "title"


---

<!-- Example 564: Links -->
[foo*]: /url

*[foo*]


---

<!-- Example 565: Links -->
[foo][bar]

[foo]: /url1
[bar]: /url2


---

<!-- Example 566: Links -->
[foo][]

[foo]: /url1


---

<!-- Example 567: Links -->
[foo]()

[foo]: /url1


---

<!-- Example 568: Links -->
[foo](not a link)

[foo]: /url1


---

<!-- Example 569: Links -->
[foo][bar][baz]

[baz]: /url


---

<!-- Example 570: Links -->
[foo][bar][baz]

[baz]: /url1
[bar]: /url2


---

<!-- Example 571: Links -->
[foo][bar][baz]

[baz]: /url1
[foo]: /url2


---

<!-- Example 572: Images -->
![foo](/url "title")


---

<!-- Example 573: Images -->
![foo *bar*]

[foo *bar*]: train.jpg "train & tracks"


---

<!-- Example 574: Images -->
![foo ![bar](/url)](/url2)


---

<!-- Example 575: Images -->
![foo [bar](/url)](/url2)


---

<!-- Example 576: Images -->
![foo *bar*][]

[foo *bar*]: train.jpg "train & tracks"


---

<!-- Example 577: Images -->
![foo *bar*][foobar]

[FOOBAR]: train.jpg "train & tracks"


---

<!-- Example 578: Images -->
![foo](train.jpg)


---

<!-- Example 579: Images -->
My ![foo bar](/path/to/train.jpg  "title"   )


---

<!-- Example 580: Images -->
![foo](<url>)


---

<!-- Example 581: Images -->
![](/url)


---

<!-- Example 582: Images -->
![foo][bar]

[bar]: /url


---

<!-- Example 583: Images -->
![foo][bar]

[BAR]: /url


---

<!-- Example 584: Images -->
![foo][]

[foo]: /url "title"


---

<!-- Example 585: Images -->
![*foo* bar][]

[*foo* bar]: /url "title"


---

<!-- Example 586: Images -->
![Foo][]

[foo]: /url "title"


---

<!-- Example 587: Images -->
![foo] 
[]

[foo]: /url "title"


---

<!-- Example 588: Images -->
![foo]

[foo]: /url "title"


---

<!-- Example 589: Images -->
![*foo* bar]

[*foo* bar]: /url "title"


---

<!-- Example 590: Images -->
![[foo]]

[[foo]]: /url "title"


---

<!-- Example 591: Images -->
![Foo]

[foo]: /url "title"


---

<!-- Example 592: Images -->
!\[foo]

[foo]: /url "title"


---

<!-- Example 593: Images -->
\![foo]

[foo]: /url "title"


---

<!-- Example 594: Autolinks -->
<http://foo.bar.baz>


---

<!-- Example 595: Autolinks -->
<https://foo.bar.baz/test?q=hello&id=22&boolean>


---

<!-- Example 596: Autolinks -->
<irc://foo.bar:2233/baz>


---

<!-- Example 597: Autolinks -->
<MAILTO:FOO@BAR.BAZ>


---

<!-- Example 598: Autolinks -->
<a+b+c:d>


---

<!-- Example 599: Autolinks -->
<made-up-scheme://foo,bar>


---

<!-- Example 600: Autolinks -->
<https://../>


---

<!-- Example 601: Autolinks -->
<localhost:5001/foo>


---

<!-- Example 602: Autolinks -->
<https://foo.bar/baz bim>


---

<!-- Example 603: Autolinks -->
<https://example.com/\[\>


---

<!-- Example 604: Autolinks -->
<foo@bar.example.com>


---

<!-- Example 605: Autolinks -->
<foo+special@Bar.baz-bar0.com>


---

<!-- Example 606: Autolinks -->
<foo\+@bar.example.com>


---

<!-- Example 607: Autolinks -->
<>


---

<!-- Example 608: Autolinks -->
< https://foo.bar >


---

<!-- Example 609: Autolinks -->
<m:abc>


---

<!-- Example 610: Autolinks -->
<foo.bar.baz>


---

<!-- Example 611: Autolinks -->
https://example.com


---

<!-- Example 612: Autolinks -->
foo@bar.example.com


---

<!-- Example 613: Raw HTML -->
<a><bab><c2c>


---

<!-- Example 614: Raw HTML -->
<a/><b2/>


---

<!-- Example 615: Raw HTML -->
<a  /><b2
data="foo" >


---

<!-- Example 616: Raw HTML -->
<a foo="bar" bam = 'baz <em>"</em>'
_boolean zoop:33=zoop:33 />


---

<!-- Example 617: Raw HTML -->
Foo <responsive-image src="foo.jpg" />


---

<!-- Example 618: Raw HTML -->
<33> <__>


---

<!-- Example 619: Raw HTML -->
<a h*#ref="hi">


---

<!-- Example 620: Raw HTML -->
<a href="hi'> <a href=hi'>


---

<!-- Example 621: Raw HTML -->
< a><
foo><bar/ >
<foo bar=baz
bim!bop />


---

<!-- Example 622: Raw HTML -->
<a href='bar'title=title>


---

<!-- Example 623: Raw HTML -->
</a></foo >


---

<!-- Example 624: Raw HTML -->
</a href="foo">


---

<!-- Example 625: Raw HTML -->
foo <!-- this is a --
comment - with hyphens -->


---

<!-- Example 626: Raw HTML -->
foo <!--> foo -->

foo <!---> foo -->


---

<!-- Example 627: Raw HTML -->
foo <?php echo $a; ?>


---

<!-- Example 628: Raw HTML -->
foo <!ELEMENT br EMPTY>


---

<!-- Example 629: Raw HTML -->
foo <![CDATA[>&<]]>


---

<!-- Example 630: Raw HTML -->
foo <a href="&ouml;">


---

<!-- Example 631: Raw HTML -->
foo <a href="\*">


---

<!-- Example 632: Raw HTML -->
<a href="\"">


---

<!-- Example 633: Hard line breaks -->
foo  
baz


---

<!-- Example 634: Hard line breaks -->
foo\
baz


---

<!-- Example 635: Hard line breaks -->
foo       
baz


---

<!-- Example 636: Hard line breaks -->
foo  
     bar


---

<!-- Example 637: Hard line breaks -->
foo\
     bar


---

<!-- Example 638: Hard line breaks -->
*foo  
bar*


---

<!-- Example 639: Hard line breaks -->
*foo\
bar*


---

<!-- Example 640: Hard line breaks -->
`code  
span`


---

<!-- Example 641: Hard line breaks -->
`code\
span`


---

<!-- Example 642: Hard line breaks -->
<a href="foo  
bar">


---

<!-- Example 643: Hard line breaks -->
<a href="foo\
bar">


---

<!-- Example 644: Hard line breaks -->
foo\


---

<!-- Example 645: Hard line breaks -->
foo  


---

<!-- Example 646: Hard line breaks -->
### foo\


---

<!-- Example 647: Hard line breaks -->
### foo  


---

<!-- Example 648: Soft line breaks -->
foo
baz


---

<!-- Example 649: Soft line breaks -->
foo 
 baz


---

<!-- Example 650: Textual content -->
hello $.;'there


---

<!-- Example 651: Textual content -->
Foo χρῆν


---

<!-- Example 652: Textual content -->
Multiple     spaces

