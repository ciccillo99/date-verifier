pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/gates.circom";
include "@zk-email/zk-regex-circom/circuits/common/from_addr_regex.circom";
include "@zk-email/circuits/email-verifier.circom";
include "@zk-email/circuits/utils/regex.circom";
include "./year-regex.circom"; 
include "./month-regex.circom"; 
include "./utils/month-lookup-table.circom"; 
include "./utils/change-endianness.circom"; 

template DateVerifier(maxHeadersLength, maxBodyLength, maxMonthBytes, maxYearBytes, n, k) {
    signal input emailHeader[maxHeadersLength];
    signal input emailHeaderLength;
    signal input pubkey[k];
    signal input signature[k];
    signal input monthIndex;
    signal input yearIndex;
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

    // Verifica che le regex facciano match
    signal isMonthFoundValid <== GreaterThan(1)([monthFound, 0]);
    signal isYearFoundValid <== GreaterThan(1)([yearFound, 0]);

    isYearFoundValid === 1;
    isMonthFoundValid === 1;

    // Converto l'anno
    signal yearPacks[1] <== PackRegexReveal(maxHeadersLength, maxYearBytes)(yearReveal, yearIndex);

    // Aggiungi il componente per l'inversione dei byte di yearNum
    component reverseYear = ReverseBytes(32, 4); // Inversione di un numero a 32 bit (4 byte)
    reverseYear.in <== yearPacks[0]; // Inverti i byte di yearPacks[0]
    signal yearNum <== reverseYear.out; // Il risultato invertito diventa yearNum

    // Converto il mese usando la lookup table
    signal monthPacks[1] <== PackRegexReveal(maxHeadersLength, maxMonthBytes)(monthReveal, monthIndex);
    component monthLookup = MonthLookup();
    monthLookup.packedMonth <== monthPacks[0];
    signal monthNum <== monthLookup.monthNumber;

    // Verifica se l'anno è maggiore dell'anno di riferimento
    component isYearGreaterComp = GreaterThan(32); // L'anno è trattato come un numero a 32 bit
    isYearGreaterComp.in[0] <== yearNum;
    isYearGreaterComp.in[1] <== refYear;
    signal isYearGreater <== isYearGreaterComp.out;

    // Verifica se l'anno è uguale all'anno di riferimento
    component isYearEqualComp = IsEqual();
    isYearEqualComp.in[0] <== yearNum;
    isYearEqualComp.in[1] <== refYear;
    signal isYearEqual <== isYearEqualComp.out;

    // Verifica se il mese è maggiore o uguale al mese di riferimento
    component isMonthValidComp = GreaterEqThan(4); // Mese trattato come un numero con max 4 bit
    isMonthValidComp.in[0] <== monthNum;
    isMonthValidComp.in[1] <== refMonth;
    signal isMonthValid <== isMonthValidComp.out;

    // Usa AND per verificare se l'anno è uguale E il mese è valido (maggiore o uguale al mese di riferimento)
    component andYearEqualMonthValid = AND();
    andYearEqualMonthValid.a <== isYearEqual;
    andYearEqualMonthValid.b <== isMonthValid;

    // Usa OR per determinare se la data è valida
    component orYearGreaterOrEqualMonthValid = OR();
    orYearGreaterOrEqualMonthValid.a <== isYearGreater; // Se l'anno è maggiore
    orYearGreaterOrEqualMonthValid.b <== andYearEqualMonthValid.out; // Oppure se l'anno è uguale e il mese è valido

    // Output finale che indica se la data è valida
    isDateValid <== orYearGreaterOrEqualMonthValid.out;
}

component main { public [refMonth, refYear] } = DateVerifier(1024, 1536, 3, 4, 121, 17);

