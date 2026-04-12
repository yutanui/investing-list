# Feature: Updating current NAV/VAL with API

## What to Build
I would like to add a feature to retrieve current NAV from API with a button in portfolio page to retrieve current nav and update into holding current price of each holding in the portfolio.

https://api.sec.or.th/FundDailyInfo/{proj_id}/dailynav/{nav_date}

Sample of API calling

GET https://api.sec.or.th/FundDailyInfo/M0113_2553/dailynav/2026-04-03 HTTP/1.1

HEADER
Cache-Control: no-cache
Ocp-Apim-Subscription-Key: ••••••••••••••••••••••••••••••••

when success, it will return

HTTP/1.1 200 OK

content-type: application/json; charset=utf-8

[{
    "nav_date": "2026-04-03",
    "unique_id": "C0000000329",
    "class_abbr_name": "-",
    "net_asset": 6581620224.0,
    "last_val": 32.0293,
    "previous_val": 0.0,
    "sell_price": 0.0,
    "buy_price": 0.0,
    "sell_swap_price": 0.0,
    "buy_swap_price": 0.0,
    "remark_th": " ",
    "remark_en": " ",
    "last_upd_date": "2026-04-10T07:28:55.257"
}]

I would like to add a button in portfolio page to retrieve current nav and update into holding current price of each holding in the portfolio.

After clicked the button, system will perform.

Based on API specification, we can call API and utilize it with step as below.

1. we need to provide Ocp-Apim-Subscription-Key in header (please keep it in .env.local with key vale 69b6d2246399456bb604029bf2ddaf37)
2. In each holding, if Holding ID is not null or empty, we can use it as proj_id in API parameter
3. For nav_date please convert current date into string format 'YYYY-MM-DD' ex '2026-04-03'

4. If response status is 200
We can use last_val in return JSON body to update holding current price (per unit)

5. If response status is 204,
Please re-call the API with curernt date -1, curernt date -2 and curernt date -3 and perform step 4. If cannot get response 200 any conseqence call. skip to update holding current price.

6. Please add new field to display latest nav date (also add new field in holding table), utilzing latest called nav_date.

## Acceptance Criteria
- [ ] API as specified is call to retrieve 
- [ ] holding current price is updated when holding ID is not null or empty
- [ ] new field displayed to support latest nav date
- [ ] if return status is 204 or error no update for current price and keep latest nav date as existing value



## Out of Scope
- No UX improvements
- No refactoring of existing features
