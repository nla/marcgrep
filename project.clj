(defproject marcgrep "1.0.6"
  :description "A slow-moving search for MARC data"
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [org.clojure/data.json "0.2.4"]
                 [org.mortbay.jetty/jetty "6.1.25"]
                 [compojure "0.6.4"]
                 [ring/ring-servlet "0.3.10"]
                 [org.marc4j/marc4j "2.9.2"]
                 [org.apache.lucene/lucene-core "3.5.0"]]
  :profiles {:prod {:resource-paths ["config/prod"]}
             :test {:resource-paths ["config/test"]}
             :cyan {:resource-paths ["config/cyan"]}}
  :plugins [[lein-ring "0.8.8"]]
  :warn-on-reflection false
  :dev-dependencies [[swank-clojure/swank-clojure "1.3.2"]]

  ;; For producing a war file
  :ring {:handler marcgrep.core/handler
         :init marcgrep.core/init}

  :aot :all

  :main marcgrep.core)
