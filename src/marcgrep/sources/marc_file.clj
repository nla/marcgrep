(ns marcgrep.sources.marc-file
  (:refer-clojure :exclude [next])
  (:require marcgrep.sources.concat
            marcgrep.sources.dedupe
            [marcgrep.sources.util :as util]
            [marcgrep.protocols.marc-source :as marc-source])
  (:use clojure.java.io)
  (:import [org.marc4j MarcPermissiveStreamReader]
           [java.io FileInputStream]
           [org.marc4j.marc Record VariableField]
           [java.io BufferedReader ByteArrayInputStream]))


(deftype MARCFile [^String filename
                   ^{:unsynchronized-mutable true :tag MarcPermissiveStreamReader} rdr]
  marc-source/MarcSource
  (init [this]
    (set! rdr (MarcPermissiveStreamReader. (FileInputStream. filename) true true)))
  (next [this]
    (when (.hasNext rdr)
      (.next rdr)))
  (close [this]))


(defn all-marc-records [config]
  (let [marc-source
        (marcgrep.sources.dedupe/dedupe-source
         (apply marcgrep.sources.concat/concat-sources
                (map #(MARCFile. % nil)
                     (util/sort-newest-to-oldest
                      (mapcat util/expand-file-name
                              (:marc-files config))))))]
    (.init marc-source)
    marc-source))
