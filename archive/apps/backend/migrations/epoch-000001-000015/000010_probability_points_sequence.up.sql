CREATE SEQUENCE probability_points_seq;

SELECT setval(
    'probability_points_seq',
    COALESCE((SELECT MAX(seq) FROM probability_points), 0) + 1,
    false
);
