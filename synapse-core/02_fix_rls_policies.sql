CREATE POLICY "synapse_memory_logs is viewable by everyone" 
ON public.synapse_memory_logs FOR SELECT USING (true);

CREATE POLICY "synapse_memory_logs is insertable by everyone" 
ON public.synapse_memory_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "synapse_memory_logs is updatable by everyone" 
ON public.synapse_memory_logs FOR UPDATE USING (true);
