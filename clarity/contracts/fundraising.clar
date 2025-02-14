;; Fundraising Campaign Contract
;; A simple contract to accept crypto donations in STX or sBTC.

;; Constants 
(define-constant contract-owner tx-sender)
(define-constant campaign-duration u173000) ;; Duration in blocks. If a block is 15 seconds, this is roughly 30 days.
(define-constant err-not-authorized (err u100))
(define-constant err-campaign-ended (err u101))
(define-constant err-goal-not-met (err u102))
(define-constant err-price-expired (err u103))
(define-constant err-campaign-not-ended (err u104))
(define-constant err-goal-met (err u105))

;; Data vars
(define-data-var beneficiary principal contract-owner)
(define-data-var campaign-start uint u0)
(define-data-var campaign-goal uint u0)  ;; in cents USD
(define-data-var total-stx uint u0) ;; in microstacks
(define-data-var total-sbtc uint u0) ;; in sats
(define-data-var donation-count uint u0)

;; Maps
(define-map stx-donations principal uint)  ;; donor -> amount
(define-map sbtc-donations principal uint) ;; donor -> amount

;; Initialize the campaign (goal is in US dollars)
(define-public (initialize-campaign (goal uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (var-set campaign-start stacks-block-height)
    (var-set campaign-goal goal)
    (ok true)))

;; Donate STX, amount in microstacks
(define-public (donate-stx (amount uint))
  (begin
    (asserts! (< stacks-block-height (+ (var-get campaign-start) campaign-duration)) 
              err-campaign-ended)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (map-set stx-donations tx-sender 
      (+ (default-to u0 (map-get? stx-donations tx-sender)) amount))
    (var-set total-stx (+ (var-get total-stx) amount))
    (var-set donation-count (+ (var-get donation-count) u1))
    (ok true)))

;; Donate sBTC
(define-public (donate-sbtc (amount uint))
  (begin
    (asserts! (< stacks-block-height (+ (var-get campaign-start) campaign-duration)) 
              err-campaign-ended)
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token transfer
      amount 
      contract-caller
      (as-contract tx-sender) 
      none))
    (map-set sbtc-donations tx-sender
      (+ (default-to u0 (map-get? sbtc-donations tx-sender)) amount))
    (var-set total-sbtc (+ (var-get total-sbtc) amount))
    (var-set donation-count (+ (var-get donation-count) u1))
    (ok true)))

;; Calculate total USD value
(define-read-only (get-total-usd)
  (let (
    (stx-price (unwrap! (contract-call? .price-feed get-stx-price) 
                        err-price-expired))
    (sbtc-price (unwrap! (contract-call? .price-feed get-sbtc-price)
                         err-price-expired))
    ;; STX: divide by 1000000 to convert microstacks to STX, then divide by 100 for cents->dollars
    (stx-value (/ (* (var-get total-stx) stx-price) u100000000))
    ;; sBTC: divide by 100000000 to convert satoshis to BTC, then divide by 100 for cents->dollars 
    (sbtc-value (/ (* (var-get total-sbtc) sbtc-price) u10000000000))
  )
    (ok (+ stx-value sbtc-value))))

;; Check if goal is met
(define-read-only (is-goal-met)
  (let (
    (total-value (unwrap! (get-total-usd) err-price-expired))
  )
    (ok (>= total-value (var-get campaign-goal)))))

;; Withdraw funds (only beneficiary, only if goal met, only if campaign is ended)
(define-public (withdraw)
  (let (
    (total-stx-amount (var-get total-stx))
    (total-sbtc-amount (var-get total-sbtc))
    (goal-met (unwrap! (is-goal-met) err-price-expired))
  )
    (asserts! (is-eq tx-sender (var-get beneficiary)) err-not-authorized)
    (asserts! (>= stacks-block-height (+ (var-get campaign-start) campaign-duration))
              err-campaign-not-ended)
    (asserts! goal-met err-goal-not-met)
    (as-contract
      (begin
        (if (> total-stx-amount u0)
          (try! (stx-transfer? total-stx-amount (as-contract tx-sender) (var-get beneficiary)))
          true)
        (if (> total-sbtc-amount u0)
          (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token transfer
            total-sbtc-amount
            (as-contract tx-sender)
            (var-get beneficiary)
            none))
          true)
        (ok true)))))

;; Refund if goal not met
;; Can only do this after the campaign has ended
(define-public (refund)
  (let (
    (stx-amount (default-to u0 (map-get? stx-donations tx-sender)))
    (sbtc-amount (default-to u0 (map-get? sbtc-donations tx-sender)))
    (goal-met (unwrap! (is-goal-met) err-price-expired))
    (contributor tx-sender)
  )
    (asserts! (>= stacks-block-height (+ (var-get campaign-start) campaign-duration))
              err-campaign-not-ended)
    (asserts! (not goal-met) err-goal-met)
    (if (> stx-amount u0)
      (begin
        (as-contract
          (try! (stx-transfer? stx-amount tx-sender contributor))))
      true)
      (map-delete stx-donations tx-sender)
    (if (> sbtc-amount u0)
      (begin
        (as-contract
          (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token transfer
            sbtc-amount
            tx-sender
            contributor
            none))))
      true)
      (map-delete sbtc-donations tx-sender)
    (ok true)))

;; Getter functions
(define-read-only (get-stx-donation (donor principal))
  (ok (default-to u0 (map-get? stx-donations donor))))

(define-read-only (get-sbtc-donation (donor principal))
  (ok (default-to u0 (map-get? sbtc-donations donor))))

(define-read-only (get-campaign-info)
  (ok {
    start: (var-get campaign-start),
    end: (+ (var-get campaign-start) campaign-duration),
    goal: (var-get campaign-goal),
    totalStx: (var-get total-stx),
    totalSbtc: (var-get total-sbtc),
    usdValue: (unwrap-panic (get-total-usd)),
    donationCount: (var-get donation-count)
  }))

(define-read-only (get-contract-balance)
  (stx-get-balance (as-contract tx-sender)))