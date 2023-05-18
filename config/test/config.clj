{:output-dir "/var/marcgrep-output"

 :state-file "/var/tmp/marcgrep.dat"

 ;; Note: the total number of active threads will be (roughly) these two values multiplied.
 :worker-threads 4
 :max-concurrent-jobs 2

 :marc-destination-list [marcgrep.destinations.marcfile marcgrep.destinations.plaintext]

 :marc-source-list [{:description "Bibliographic and Holdings data"
                     :driver marcgrep.sources.marc-file
                     :marc-files ["/apps/data/folio-cache/MARC_BIB.mrc"]}

                    {:description "Authority data"
                     :driver marcgrep.sources.marc-file
                     :marc-files ["/apps/data/folio-cache/MARC_AUTHORITY.mrc"]}
                    ]
}
