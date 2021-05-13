{:output-dir "/var/marcgrep-output"

 :state-file "/var/tmp/marcgrep.dat"

 ;; Note: the total number of active threads will be (roughly) these two values multiplied.
 :worker-threads 4
 :max-concurrent-jobs 2

 :marc-destination-list [marcgrep.destinations.marcfile marcgrep.destinations.plaintext]

 :marc-source-list [{:description "Bibliographic data"
                     :driver marcgrep.sources.nla
                     :index-path "/var/local/solr/data/index"
                     :stored-field "fullrecord"
                     :parser-threads 3
                     :batch-size 64}

                    {:description "Holdings data"
                     :driver marcgrep.sources.voyager
                     :marc-files [{:dir "/var/local/marcgrep"
                                   :pattern #"holdings.*mrc.*$"}]
                     :voyager-deletes-file "/var/local/marcgrep/deleted.mfhd.marc"}

                    {:description "Authority data"
                     :driver marcgrep.sources.marc-file
                     :marc-files ["/export/home/voyager/marcexport/test/auth-export/authority-full.mrc"]}
                    ]
}