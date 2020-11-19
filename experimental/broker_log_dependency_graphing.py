import pandas as pd
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt
import json
import time
 
s = '{"map": {"":{"0577":true,"0790":true,"0980":true,"1013":true,"1900":true},"0":{"0430":true,"1603":true},"0011":{"0011":true},"0020":{"0045":true},"0030":{"0045":true},"0045":{"0141":true,"0430":true,"1013":true,"1681":true,"1900":true},"0111":{"0141":true,"0286":true,"1013":true,"1681":true,"1900":true},"0141":{"0430":true},"0390":{"0141":true,"0760":true,"0980":true,"1013":true,"1459":true,"1900":true},"0430":{"0430":true,"1993":true,"1999":true},"0577":{"0980":true,"1013":true},"0620":{"0141":true,"0993":true,"1681":true},"0650":{"1013":true,"1603":true},"0826":{"1900":true},"0980":{"0790":true,"0980":true},"0993":{"0430":true,"0760":true},"1013":{"0430":true,"0980":true,"1900":true},"1601":{"0430":true,"0620":true,"0826":true,"1603":true},"1603":{"0430":true,"0620":true,"1603":true},"1630":{"1970":true},"1681":{"0430":true},"1850":{"0045":true},"1982":{"0430":true},"2020":{"0760":true,"2039":true,"2044":true},"2039":{"0049":true},"2044":{"0430":true},"subscription":{"0141":true,"0430":true,"1999":true}}}'
m = json.loads(s)
d = m["map"]
from_map = []
to_map = []
for x in d:
    for y in d[x]:
        from_map.append(x) 
        to_map.append(y)
# 'from':['0011', '0045', '1900','1970', '1970],
#   'to':['0011', '1850', '0045','1630', 'preexisting']
# df = pd.DataFrame({ 'from':['A', 'B', 'C','A'], 'to':['D', 'A', 'E','C']})
df = pd.DataFrame({ 'from':from_map, 'to':to_map})
G=nx.from_pandas_edgelist(df, 'from', 'to', create_using=nx.DiGraph())
# nx.draw(G, with_labels=True)
nx.draw_circular(G, with_labels=True, arrows=True, edge_color=[0.5, 0.5, 0.5])
# nx.draw_kamada_kawai(G, with_labels=True, edge_color=[0.5, 0.5, 0.5])
# nx.draw_planar(G, with_labels=True, edge_color=[0.5, 0.5, 0.5])
plt.show()
