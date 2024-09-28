pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";
include "@zk-email/zk-regex-circom/circuits/common/from_addr_regex.circom";
include "@zk-email/circuits/email-verifier.circom";
include "@zk-email/circuits/utils/regex.circom";
include "./year-regex.circom"; 
include "./month-regex.circom"; 
include "./utils/month-lookup-table.circom"; 

template DateVerifier(maxHeadersLength, maxBodyLength, maxMonthBytes, maxYearBytes, n, k) {
    signal input emailHeader[maxHeadersLength];
    signal input emailHeaderLength;
    signal input pubkey[k];
    signal input signature[k];
    signal input refYear;   // Reference year for comparison
    signal input refMonth;  // Reference month for comparison

    signal output pubkeyHash;
    signal output isDateValid; // Output signal for date validation

    component EV = EmailVerifier(maxHeadersLength, maxBodyLength, n, k, 1, 0, 0);
    EV.emailHeader <== emailHeader;
    EV.pubkey <== pubkey;
    EV.signature <== signature;
    EV.emailHeaderLength <== emailHeaderLength;

    pubkeyHash <== EV.pubkeyHash;

    // Controllo: emailHeaderLength deve essere inferiore a maxHeadersLength
    signal isEmailHeaderLengthValid <== LessThan(log2Ceil(maxHeadersLength))([emailHeaderLength, maxHeadersLength]);
    isEmailHeaderLengthValid === 1;

    // Estrarre il mese e l'anno
    signal (monthFound, monthReveal[maxHeadersLength]) <== MonthRegex(maxHeadersLength)(emailHeader);
    signal (yearFound, yearReveal[maxHeadersLength]) <== YearRegex(maxHeadersLength)(emailHeader);

    // Verifica che gli indici di regex siano validi
    signal isMonthFoundValid <== GreaterThan(log2Ceil(maxHeadersLength))([monthFound, 0]);
    signal isYearFoundValid <== GreaterThan(log2Ceil(maxHeadersLength))([yearFound, 0]);

    isMonthFoundValid === 1;
    isYearFoundValid === 1;

    // Converto l'anno
    signal yearPacked[1] <== PackRegexReveal(maxHeadersLength, maxYearBytes)(yearReveal, yearFound);
    signal yearNum <== yearPacked[0];  // Estraggo l'anno

    // Converto il mese usando la lookup table
    signal monthPacked[1] <== PackRegexReveal(maxHeadersLength, maxMonthBytes)(monthReveal, monthFound);
    component monthLookup = MonthLookup();
    monthLookup.packedMonth <== monthPacked[0];
    signal monthNum <== monthLookup.monthNumber;

    // Verifica se l'anno è maggiore dell'anno di riferimento
    component isYearGreaterComp = GreaterThan(16);
    isYearGreaterComp.in[0] <== yearNum;
    isYearGreaterComp.in[1] <== refYear;
    signal isYearGreater <== isYearGreaterComp.out;

    // Verifica se l'anno è uguale all'anno di riferimento
    component isYearEqualComp = IsEqual();
    isYearEqualComp.in[0] <== yearNum;
    isYearEqualComp.in[1] <== refYear;
    signal isYearEqual <== isYearEqualComp.out;

    // Se l'anno è uguale, controlla il mese
    component isMonthValidComp = GreaterEqThan(8);
    isMonthValidComp.in[0] <== monthNum;
    isMonthValidComp.in[1] <== refMonth;
    signal isMonthValid <== isMonthValidComp.out;

    // La data è valida se l'anno è maggiore, oppure se l'anno è uguale e il mese è valido
    isDateValid <== isYearGreater + (isYearEqual * isMonthValid);
}

component main { public [refMonth, refYear] } = DateVerifier(1024, 1536, 3, 4, 121, 17);


