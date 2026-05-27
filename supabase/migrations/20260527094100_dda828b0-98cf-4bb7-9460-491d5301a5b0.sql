CREATE OR REPLACE FUNCTION public._tmp_exec_seed(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
REVOKE ALL ON FUNCTION public._tmp_exec_seed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._tmp_exec_seed(text) TO service_role;