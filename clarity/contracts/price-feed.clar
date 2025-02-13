;; Simple price feed for STX and sBTC
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u100))
(define-constant err-price-expired (err u101))

;; price data stored as integers with 8 decimal places
(define-data-var stx-price-cents uint u0)  ;; STX/USD price in cents
(define-data-var sbtc-price-cents uint u0) ;; sBTC/USD price in cents
(define-data-var last-update uint u0)      ;; block height of last update

;; Uncomment if you want to enforce a time limit on price validity
;; (define-data-var price-valid-duration uint u5760) ;; if a block is 15 seconds, this is ~24 hours in blocks

(define-public (update-prices (stx-price uint) (sbtc-price uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (var-set stx-price-cents stx-price)
    (var-set sbtc-price-cents sbtc-price)
    (var-set last-update stacks-block-height)
    (ok true)))

(define-read-only (get-stx-price)
  (begin 
    ;; Uncomment if you want to enforce a time limit on the price validity
    ;; (asserts! (< (- stacks-block-height (var-get last-update)) (var-get price-valid-duration))
    ;;           err-price-expired)
    (ok (var-get stx-price-cents))))

(define-read-only (get-sbtc-price)
  (begin
    ;; Uncomment if you want to enforce a time limit on the price validity
    ;; (asserts! (< (- stacks-block-height (var-get last-update)) (var-get price-valid-duration))
    ;;           err-price-expired)
    (ok (var-get sbtc-price-cents))))

(define-read-only (get-last-update)
  (ok (var-get last-update)))