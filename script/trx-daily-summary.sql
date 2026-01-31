-- Transaction Daily Summary Table for Performance Optimization
-- This table aggregates daily transaction data for efficient AML analysis

CREATE TABLE trx_daily_summary (
    subject_id UUID NOT NULL,
    transaction_date DATE NOT NULL,
    org_unit_code VARCHAR(20) NOT NULL,
    
    -- Volume metrics
    total_transactions INTEGER DEFAULT 0,
    debit_transactions INTEGER DEFAULT 0,
    credit_transactions INTEGER DEFAULT 0,
    total_debit_amount DECIMAL(18,2) DEFAULT 0,
    total_credit_amount DECIMAL(18,2) DEFAULT 0,
    
    -- Min/Max amounts for behavioral analysis
    min_debit_amount DECIMAL(18,2),
    max_debit_amount DECIMAL(18,2),
    min_credit_amount DECIMAL(18,2),
    max_credit_amount DECIMAL(18,2),
    
    -- Diversity metrics (key for AML pattern detection)
    distinct_counterparties INTEGER DEFAULT 0,
    distinct_countries INTEGER DEFAULT 0,
    distinct_booking_types INTEGER DEFAULT 0,
    distinct_products INTEGER DEFAULT 0,
    distinct_channels INTEGER DEFAULT 0,
    
    -- Risk indicators (using country table)
    high_risk_country_transactions INTEGER DEFAULT 0,
    tax_haven_transactions INTEGER DEFAULT 0,
    terrorist_haven_transactions INTEGER DEFAULT 0,
    fatf_flag_transactions INTEGER DEFAULT 0,
    cross_currency_transactions INTEGER DEFAULT 0,
    unusual_hours_transactions INTEGER DEFAULT 0,
    weekend_transactions INTEGER DEFAULT 0,
    
    -- Top patterns (JSON for flexibility)
    top_countries JSONB,
    top_booking_types JSONB,
    top_products JSONB,
    top_channels JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (subject_id, transaction_date, org_unit_code)
);

-- Indexes for efficient querying
CREATE INDEX idx_trx_daily_summary_subject_date ON trx_daily_summary (subject_id, transaction_date DESC);
CREATE INDEX idx_trx_daily_summary_org_unit ON trx_daily_summary (org_unit_code);
CREATE INDEX idx_trx_daily_summary_date ON trx_daily_summary (transaction_date DESC);

-- Function to update daily summaries (called after daily batch processing)
CREATE OR REPLACE FUNCTION update_daily_transaction_summary(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS INTEGER AS $$
DECLARE
    records_processed INTEGER;
BEGIN
    -- Delete existing records for the target date
    DELETE FROM trx_daily_summary WHERE transaction_date = target_date;
    
    -- Insert new aggregated data
    INSERT INTO trx_daily_summary (
        subject_id,
        transaction_date,
        org_unit_code,
        total_transactions,
        debit_transactions,
        credit_transactions,
        total_debit_amount,
        total_credit_amount,
        min_debit_amount,
        max_debit_amount,
        min_credit_amount,
        max_credit_amount,
        distinct_counterparties,
        distinct_countries,
        distinct_booking_types,
        distinct_products,
        distinct_channels,
        high_risk_country_transactions,
        tax_haven_transactions,
        terrorist_haven_transactions,
        fatf_flag_transactions,
        cross_currency_transactions,
        unusual_hours_transactions,
        weekend_transactions,
        top_countries,
        top_booking_types,
        top_products,
        top_channels
    )
    SELECT 
        tgl.subject_id,
        tgl.submit_date_time::DATE as transaction_date,
        tgl.org_unit_code,
        
        -- Volume metrics
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN tgl.credit_debit = 'D' THEN 1 END) as debit_transactions,
        COUNT(CASE WHEN tgl.credit_debit = 'C' THEN 1 END) as credit_transactions,
        COALESCE(SUM(CASE WHEN tgl.credit_debit = 'D' THEN tgl.amount_base END), 0) as total_debit_amount,
        COALESCE(SUM(CASE WHEN tgl.credit_debit = 'C' THEN tgl.amount_base END), 0) as total_credit_amount,
        
        -- Min/Max amounts
        MIN(CASE WHEN tgl.credit_debit = 'D' THEN tgl.amount_base END) as min_debit_amount,
        MAX(CASE WHEN tgl.credit_debit = 'D' THEN tgl.amount_base END) as max_debit_amount,
        MIN(CASE WHEN tgl.credit_debit = 'C' THEN tgl.amount_base END) as min_credit_amount,
        MAX(CASE WHEN tgl.credit_debit = 'C' THEN tgl.amount_base END) as max_credit_amount,
        
        -- Diversity metrics
        COUNT(DISTINCT tgl.counter_party_name) as distinct_counterparties,
        COUNT(DISTINCT tgl.counter_party_country) as distinct_countries,
        COUNT(DISTINCT tgl.booking_type) as distinct_booking_types,
        COUNT(DISTINCT tgl.product_id) as distinct_products,
        COUNT(DISTINCT tgl.channel) as distinct_channels,
        
        -- Risk indicators using country table
        COUNT(CASE WHEN c.high_risk = true THEN 1 END) as high_risk_country_transactions,
        COUNT(CASE WHEN c.tax_haven = true THEN 1 END) as tax_haven_transactions,
        COUNT(CASE WHEN c.terrorist_haven = true THEN 1 END) as terrorist_haven_transactions,
        COUNT(CASE WHEN c.fatf_flag = true THEN 1 END) as fatf_flag_transactions,
        COUNT(CASE WHEN tgl.currency_base != tgl.currency_orig THEN 1 END) as cross_currency_transactions,
        COUNT(CASE WHEN EXTRACT(HOUR FROM tgl.submit_date_time) < 6 OR EXTRACT(HOUR FROM tgl.submit_date_time) > 22 THEN 1 END) as unusual_hours_transactions,
        COUNT(CASE WHEN EXTRACT(DOW FROM tgl.submit_date_time) IN (0, 6) THEN 1 END) as weekend_transactions,
        
        -- Top patterns as JSON
        (
            SELECT json_agg(json_build_object('country', country, 'count', cnt) ORDER BY cnt DESC)
            FROM (
                SELECT tgl2.counter_party_country as country, COUNT(*) as cnt
                FROM trx_general_ledger tgl2
                WHERE tgl2.subject_id = tgl.subject_id 
                  AND tgl2.submit_date_time::DATE = target_date
                  AND tgl2.counter_party_country IS NOT NULL
                GROUP BY tgl2.counter_party_country
                ORDER BY cnt DESC
                LIMIT 5
            ) top_countries_subq
        ) as top_countries,
        
        (
            SELECT json_agg(json_build_object('bookingType', booking_type, 'count', cnt) ORDER BY cnt DESC)
            FROM (
                SELECT tgl2.booking_type, COUNT(*) as cnt
                FROM trx_general_ledger tgl2
                WHERE tgl2.subject_id = tgl.subject_id 
                  AND tgl2.submit_date_time::DATE = target_date
                GROUP BY tgl2.booking_type
                ORDER BY cnt DESC
                LIMIT 5
            ) top_booking_types_subq
        ) as top_booking_types,
        
        (
            SELECT json_agg(json_build_object('productId', product_id, 'productIdentifier', product_identifier, 'count', cnt) ORDER BY cnt DESC)
            FROM (
                SELECT tgl2.product_id, pb.identifier as product_identifier, COUNT(*) as cnt
                FROM trx_general_ledger tgl2
                JOIN product_base pb ON tgl2.product_id = pb.id
                WHERE tgl2.subject_id = tgl.subject_id 
                  AND tgl2.submit_date_time::DATE = target_date
                GROUP BY tgl2.product_id, pb.identifier
                ORDER BY cnt DESC
                LIMIT 5
            ) top_products_subq
        ) as top_products,
        
        (
            SELECT json_agg(json_build_object('channel', channel, 'count', cnt) ORDER BY cnt DESC)
            FROM (
                SELECT tgl2.channel, COUNT(*) as cnt
                FROM trx_general_ledger tgl2
                WHERE tgl2.subject_id = tgl.subject_id 
                  AND tgl2.submit_date_time::DATE = target_date
                GROUP BY tgl2.channel
                ORDER BY cnt DESC
                LIMIT 5
            ) top_channels_subq
        ) as top_channels
        
    FROM trx_general_ledger tgl
    LEFT JOIN country c ON tgl.counter_party_country = c.code
    WHERE tgl.submit_date_time::DATE = target_date
    GROUP BY tgl.subject_id, tgl.submit_date_time::DATE, tgl.org_unit_code;
    
    GET DIAGNOSTICS records_processed = ROW_COUNT;
    
    RETURN records_processed;
END;
$$ LANGUAGE plpgsql;

-- Batch processing function for date ranges
CREATE OR REPLACE FUNCTION update_daily_transaction_summary_batch(
    start_date DATE,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    processing_date DATE,
    records_processed INTEGER,
    execution_time INTERVAL
) AS $$
DECLARE
    process_date DATE;
    actual_end_date DATE;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    processed_count INTEGER;
BEGIN
    -- Set end date to start date if not provided (single date processing)
    actual_end_date := COALESCE(end_date, start_date);
    
    -- Validate date range
    IF start_date > actual_end_date THEN
        RAISE EXCEPTION 'Start date cannot be after end date';
    END IF;
    
    -- Process each date in the range
    process_date := start_date;
    
    WHILE process_date <= actual_end_date LOOP
        start_time := clock_timestamp();
        
        -- Process the current date
        SELECT update_daily_transaction_summary(process_date) INTO processed_count;
        
        end_time := clock_timestamp();
        
        -- Return progress information
        RETURN QUERY SELECT 
            process_date,
            processed_count,
            (end_time - start_time);
        
        -- Move to next date
        process_date := process_date + 1;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Convenience function to rebuild all aggregates for a subject
CREATE OR REPLACE FUNCTION rebuild_subject_transaction_summary(
    target_subject_id VARCHAR(50),
    start_date DATE,
    end_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS INTEGER AS $$
DECLARE
    total_records INTEGER := 0;
    daily_count INTEGER;
    process_date DATE;
BEGIN
    -- Delete existing records for the subject in the date range
    DELETE FROM trx_daily_summary 
    WHERE subject_id = target_subject_id 
      AND transaction_date BETWEEN start_date AND end_date;
    
    -- Process each date
    process_date := start_date;
    WHILE process_date <= end_date LOOP
        SELECT COUNT(*) INTO daily_count
        FROM trx_general_ledger
        WHERE subject_id = target_subject_id
          AND submit_date_time::DATE = process_date;
        
        IF daily_count > 0 THEN
            -- Only process dates with data
            PERFORM update_daily_transaction_summary(process_date);
            total_records := total_records + daily_count;
        END IF;
        
        process_date := process_date + 1;
    END LOOP;
    
    RETURN total_records;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT update_daily_transaction_summary(); -- Process yesterday's data
-- SELECT update_daily_transaction_summary('2025-07-09'); -- Process specific date
-- 
-- SELECT * FROM update_daily_transaction_summary_batch('2025-07-01', '2025-07-09'); -- Process date range
-- SELECT * FROM update_daily_transaction_summary_batch('2025-07-09'); -- Process single date
-- 
-- SELECT rebuild_subject_transaction_summary('CUST123', '2025-01-01', '2025-07-09'); -- Rebuild for specific subject