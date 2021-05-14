(ns marcgrep.test.core
  (:refer-clojure :exclude [next])
  (:use marcgrep.test.test-utils
        clojure.test)
  (:require marcgrep.core
            marcgrep.config
            [marcgrep.destinations.plaintext :as text])
  (:import [org.marc4j.marc MarcFactory]
           (java.io StringWriter)))


(def test-dataset
  [(marc-record {"001" "12345"}
                [{:tag "245" :subfields [[\a "hello world"]]}])
   (marc-record {"001" "23456"}
                [{:tag "245" :subfields [[\a "this is a test"]]}])
   (marc-record {"001" "34567"}
                [{:tag "245" :subfields [[\a "testing 123"]]}])
   (marc-record {"001" "45678"}
                [{:tag "245" :subfields [[\a "the rain in Spain"]]}
                 {:tag "100" :subfields [[\a "Hello, Mark"]]}])
   (marc-record {"001" "56789"}
                [{:tag "245" :subfields [[\a "this is Mark's test record"]
                                         [\a "with a repeated subfield a"]]}])
   (marc-record {"001" "67890"}
                [{:tag "245" :ind2 \2 :subfields [[\a "hello world"]]}])
   (marc-record {"001" "78901"}
                [{:tag "245" :ind2 \7 :subfields [[\a "hello world"]]}])

   (marc-record {"001" "89012"}
                [{:tag "245" :ind1 \0 :ind2 \3
                  :subfields [[\a "hello world"]]}])

   (marc-record {"001" "90123"}
                [{:tag "035" :ind1 \space :ind2 \3
                  :subfields [[\a "hello world"]]}])])


(defn suite-setup [f]
  (marcgrep.config/load-config (java.io.StringReader. "{:max-concurrent-jobs 1 :poll-delay-ms 50}"))
  (binding [marcgrep.core/*snapshots-enabled* false]
    (f)))


(defn test-setup [f]
  (reset! marcgrep.core/job-queue [])
  (f))


(use-fixtures :once suite-setup)
(use-fixtures :each test-setup)


;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Tests...

(deftest substring-search
  (the-query {:operator "contains"
              :field "245$a"
              :value "hello"}
             :on test-dataset
             :matches ["12345"]
             :does-not-match ["23456"]))

(deftest controlfield-search
  (the-query {:operator "contains"
              :field "001"
              :value "12345"}
             :on test-dataset
             :matches ["12345"]
             :does-not-match ["23456"]))


(deftest substring-search-ignores-case
  (the-query {:operator "contains"
              :field "245$a"
              :value "HELLO WoRlD"}
             :on test-dataset
             :matches ["12345"]))

(deftest regexp-search-honours-case
  (the-query {:operator "matches_regexp"
              :field "245$a"
              :value ".*HELLO.*"}
             :on test-dataset
             :does-not-match ["12345"]))

(deftest regexp-search-finds-substring
  (the-query {:operator "matches_regexp"
              :field "245$a"
              :value "hello"}
             :on test-dataset
             :matches ["12345"]))


(deftest sources-are-batched
  (let [gen-1 (apply canned-marcsource test-dataset)
        gen-2 (apply canned-marcsource test-dataset)

        dest-1 (checking-marcdest)
        dest-2 (checking-marcdest)
        dest-3 (checking-marcdest)
        dest-4 (checking-marcdest)

        query {:operator "contains"
               :field "245$a"
               :value "hello"}

        ;; In spite of them being added in this order, we should see both the
        ;; gen-1 tests run first.
        job-1 (marcgrep.core/add-job gen-1 dest-1 query nil)
        job-2 (marcgrep.core/add-job gen-2 dest-2 query nil)
        job-3 (marcgrep.core/add-job gen-1 dest-3 query nil)
        job-4 (marcgrep.core/add-job gen-2 dest-4 query nil)

        test-fn (fn [key a old-state new-state]
                  (when (and (not= (:status old-state) :running)
                             (= (:status new-state) :running))
                    ;; If gen-2 jobs are running then both of the gen-1 jobs
                    ;; should have now finished.
                    (is (= (:status @job-1) :completed))
                    (is (= (:status @job-3) :completed))))]

    (add-watch job-2 :ensure-gen-1-jobs-finished test-fn)
    (add-watch job-4 :ensure-gen-1-jobs-finished test-fn)

    (send-off marcgrep.core/job-runner marcgrep.core/schedule-job-run)

    ;; wait for them all to finish
    (doseq [dst [dest-1 dest-2 dest-3 dest-4]]
      @(:matched-ids dst))))


(deftest exists-search
  (the-query {:operator "exists"
              :field "001"
              :value true}
             :on test-dataset
             :matches ["12345" "23456"]))

(deftest non-existent-control-field
  (the-query {:operator "contains"
              :field "007"
              :value "hello"}
             :on test-dataset
             :does-not-match ["12345" "23456"]))

(deftest all-fields-search
  (the-query {:operator "contains"
              :field "*"
              :value "hello"}
             :on test-dataset
             :matches ["12345"]
             :does-not-match ["23456"]))

(deftest field-wildcard-search
  (the-query {:operator "contains"
              :field "2*"
              :value "hello"}
             :on test-dataset
             :matches ["12345"]
             :does-not-match ["45678"]))

(deftest keyword-search
  (the-query {:operator "contains_keyword"
              :field "*"
              :value "test"}
             :on test-dataset
             :matches ["23456"]
             :does-not-match ["34567"]))

(deftest keyword-search-honours-apostrophe
  (the-query {:operator "contains_keyword"
              :field "*"
              :value "mark"}
             :on test-dataset
             :matches ["45678"]
             :does-not-match ["56789"]))

(deftest keyword-search-honours-apostrophe-2
  (the-query {:operator "contains_keyword"
              :field "*"
              :value "mark's"}
             :on test-dataset
             :matches ["56789"]
             :does-not-match ["45678"]))

(deftest keyword-search-negated
  (the-query {:operator "does_not_contain_keyword"
              :field "*"
              :value "test"}
             :on test-dataset
             :matches ["34567"]
             :does-not-match ["23456"]))

(deftest repeating-subfield
  (the-query {:operator "repeats_subfield"
              :field "245"
              :value "a"}
             :on test-dataset
             :matches ["56789"]
             :does-not-match ["12345"]))


(deftest not-repeating-subfield
  (the-query {:operator "does_not_repeat_subfield"
              :field "245"
              :value "a"}
             :on test-dataset
             :does-not-match ["56789"]
             :matches ["12345"]))

(deftest extended-indicator-check
  (the-query {:operator "contains"
              :field "245!#[5-9]$a"
              :value "hello"}
             :on test-dataset
             :does-not-match ["67890"]
             :matches ["78901"]))

(deftest extended-indicator-check-2
  (the-query {:operator "contains"
              :field "245![012][2-9]$a"
              :value "hello"}
             :on test-dataset
             :does-not-match ["78901"]
             :matches ["89012"]))

(deftest extended-indicator-check-3
  (the-query {:operator "exists"
              :field "*! [0-5]"
              :value "hello"}
             :on test-dataset
             :matches ["90123"]
             :does-not-match ["89012" "78901"]))

(deftest extended-wildcard-indicator
  (the-query {:operator "contains"
              :field "*!##"
              :value "12345"}
             :on test-dataset
             :does-not-match ["12345"]))

(deftest exists-subfields
  (the-query {:operator "exists"
              :field "245$m"
              :value true}
             :on test-dataset
             :does-not-match ["12345"]))

(deftest write-pretty-record-leader
  "Test writing pretty records: can write complete record, limit output to given fields, includes Leader as 000"
  (let [writer-1 (StringWriter.)
        record-1 (marc-record {"001" "111111"} [{:tag "245" :subfields [[\a "test"]]}])
        str-match-1 "000 00000nam a2200000 a 4500\r\n001 111111\r\n245     $a test\r\n\r\n"
        writer-2 (StringWriter.)
        record-2 (marc-record {"001" "222222"} [{:tag "100" :subfields [[\a "another test"]]}])
        str-match-2 "001 222222\r\n\r\n"
        writer-3 (StringWriter.)
        record-3 (marc-record {"001" "333333"} [{:tag "100" :subfields [[\a "and test again"]]}])
        str-match-3 "000 00000nam a2200000 a 4500\r\n\r\n"]
    (do (text/write-pretty-record record-1 writer-1 nil)
        (is (= str-match-1 (.toString writer-1)))
        (text/write-pretty-record record-2 writer-2 #{"001"})
        (is (= str-match-2 (.toString writer-2)))
        (text/write-pretty-record record-3 writer-3 #{"000"})
        (is (= str-match-3 (.toString writer-3))))))