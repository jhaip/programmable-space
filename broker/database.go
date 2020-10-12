package main

import (
	"sort"
	// "time"
)

// type Term struct {
// 	Type  string
// 	Value string
// }

type Fact struct {
	Terms []Term
}

type QueryResult struct {
	Result map[string]Term
}

func term_to_string(term Term) string {
	switch term.Type {
	case "id":
		return "#" + term.Value
	case "variable":
		return "$" + term.Value
	case "postfix":
		return "%" + term.Value
	default:
		return term.Value
	}
}

func terms_to_string(terms []Term) string {
	str := ""
	for i, term := range terms {
		if i > 0 {
			str += " "
		}
		str += term_to_string(term)
	}
	return str
}

func fact_to_string(fact Fact) string {
	return terms_to_string(fact.Terms)
}

// func print_all_facts(facts map[string]Fact) {
// 	fmt.Println("### Database of Facts ###")
// 	for _, fact := range facts {
// 		fmt.Println(fact_to_string(fact))
// 	}
// 	fmt.Println("#########################")
// }

func fact_match(A Fact, B Fact, env QueryResult) (bool, QueryResult) {
	A_has_postfix := A.Terms[len(A.Terms)-1].Type == "postfix"
	if A_has_postfix {
		if len(A.Terms) > len(B.Terms) {
			return false, QueryResult{}
		}
	} else if len(A.Terms) != len(B.Terms) {
		return false, QueryResult{}
	}
	new_env := QueryResult{map[string]Term{}}
	for k, v := range env.Result {
		new_env.Result[k] = v
	}
	for i, A_term := range A.Terms {
		B_term := B.Terms[i]
		did_match, tmp_new_env := term_match(A_term, B_term, new_env)
		if did_match == false {
			return false, QueryResult{}
		}
		new_env = tmp_new_env
		if A_term.Type == "postfix" {
			postfix_variable_name := A_term.Value
			if postfix_variable_name != "" {
				new_env.Result[postfix_variable_name] = Term{"text", terms_to_string(B.Terms[i:])}
			}
			break
		}
	}
	return true, new_env
}

func term_match(A Term, B Term, env QueryResult) (bool, QueryResult) {
	if A.Type == "variable" || A.Type == "postfix" {
		variable_name := A.Value
		// "Wilcard" matches all but doesn't have a result
		if variable_name == "" {
			return true, env
		}
		_, variable_name_in_result := env.Result[variable_name]
		if variable_name_in_result {
			return term_match(env.Result[variable_name], B, env)
		} else {
			new_env := QueryResult{map[string]Term{}}
			for k, v := range env.Result {
				new_env.Result[k] = v
			}
			new_env.Result[variable_name] = B
			return true, new_env
		}
	} else if A.Type == B.Type && A.Value == B.Value {
		return true, env
	}
	return false, QueryResult{}
}

func collect_solutions(facts map[string]Fact, query []Fact, env QueryResult) []QueryResult {
	if len(query) == 0 {
		return []QueryResult{env}
	}
	first_query_fact := query[0]
	solutions := make([]QueryResult, 0)
	var keys []string
	for k := range facts {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fact := facts[k]
		did_match, new_env := fact_match(first_query_fact, fact, env)
		if did_match {
			solutions = append(solutions, collect_solutions(facts, query[1:], new_env)...)
		}
	}
	return solutions
}

func select_facts(facts map[string]Fact, query []Fact) []QueryResult {
	empty_env := QueryResult{map[string]Term{}}
	return collect_solutions(facts, query, empty_env)
}

func fact_has_variables_or_wildcards(fact Fact) bool {
	for _, term := range fact.Terms {
		if term.Type == "variable" || term.Type == "postfix" {
			return true
		}
	}
	return false
}

func retract(facts *map[string]Fact, factQuery Fact) {
	if fact_has_variables_or_wildcards(factQuery) {
		for factString, fact := range *facts {
			did_match, _ := fact_match(factQuery, fact, QueryResult{})
			if did_match {
				delete(*facts, factString)
			}
		}
	} else {
		delete(*facts, fact_to_string(factQuery))
	}
}

func claim(facts *map[string]Fact, fact Fact) {
	(*facts)[fact_to_string(fact)] = fact
}

func make_fact_database() map[string]Fact {
	factMap := make(map[string]Fact)
	return factMap
}
