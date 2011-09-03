MARCgrep lets you find all the records in a library collection
matching some criteria.  It searches MARC records in the dumbest way
possible: parsing them one at a time and returning any that match.

Input and output are designed to be pluggable, so it should be
possible to extend MARCgrep to read your MARC records from any source
and write them out in whatever format you like.  So far I've got it
reading records from a file or a Lucene index, and writing to either
MARC21 or plain text, but I'd be happy to lend a hand if you have
grand ideas.

This is all a work in progress, but here's what the user interface
current looks like:

![screenshot](https://github.com/marktriggs/marcgrep/raw/master/screenshot.png)


Building it
-----------

  1.  Get Leiningen from http://github.com/technomancy/leiningen and put
      the 'lein' script somewhere in your $PATH.

  2.  From marcgrep's root directory, run 'lein uberjar'.  Lein will grab
      all required dependencies and produce a 'marcgrep-0.1-standalone.jar'.

  3. Copy config.clj.example to config.clj and edit as appropriate

  4.  Run the jar with, for example:

        java -cp marcgrep-0.1-standalone.jar marcgrep.core

  5.  Point your browser at http://localhost:9095/
