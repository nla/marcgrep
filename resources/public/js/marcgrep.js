function reset_form(elt) {
    $(elt).find(':text').val('');
}

function remove_groups() {
    var checked = $('.grouper_checkbox:checked');

    checked.each(function(idx, elt) {
        $(elt).parents('.clause_group').remove();
    });

    if ($('.clause_group').size() == 0) {
        location.reload(true);
    } else {
        update_form();
    }
}


function clone_clause(clause)
{
    var cloned = $(clause).clone(true);
    $(cloned).find('select.boolean_options').val($(clause).find('select.boolean_options').val());
    $(cloned).find('select.operator').val($(clause).find('select.operator').val());

    return cloned;
}

function merge_groups() {
    var checked = $('.grouper_checkbox:checked');

    if (checked.size() < 2) {
        return;
    }

    checked.attr('checked', false);

    var borg = $(checked[0]).parents('.clause_group');

    checked.each(function(idx, victim_checkbox) {
        if (idx > 0) {
            var victim = $(victim_checkbox).parents('.clause_group');
            var reborn = victim.clone(true);

            victim.fadeOut(500, function() {
                victim.find('.where_clause').each(function(idx, clause) {
                    borg.append(clone_clause(clause));
                });
                borg.addClass('group_indicator');
                victim.remove();
                update_form();
            });
        }
    });

}


function split_groups() {
    var checked = $('.grouper_checkbox:checked');

    var groups_to_split = []
    checked.each(function(idx, elt) {
        var group = $(elt).parents('.clause_group');
        var clauses = $(group).find('.where_clause');

        if (clauses.size() > 1) {
            groups_to_split.push(group);
        }
    });

    $(groups_to_split).each(function(idx, group) {
        var clauses = $(group).find('.where_clause');

        $(clauses.get().reverse()).each(function(idx, clause) {
            insert_clause(clone_clause(clause), group);
        });

        group.remove();
    });

    update_form();
}


function update_buttons() {
    var checked = $('.grouper_checkbox:checked');

    if (checked.size() == 0) {
        $('#remove_button').fadeOut();
        $('#ungroup_button').fadeOut();
    } else {
        $('#remove_button').fadeIn();
    }

    checked.each(function(idx, elt) {
        var group = $(elt).parents('.clause_group');
        if ($(group).find('.where_clause').size() > 1) {
            $('#ungroup_button').fadeIn();
            return;
        }
    })

        if (checked.size() > 1) {
            $('#group_button').fadeIn();
        } else {
            $('#group_button').fadeOut();
        }
}


function update_form() {
    $('.grouper_checkbox').remove();

    $('.clause_group:first').find('.boolean_label:first').html('<b>Where</b>');

    $('.where_clause').each(function(idx, clause) {
        var selected = $(clause).find('.operator option:selected');
        $(clause).find('.field_value').attr('disabled', selected.attr('no_value') == "1");

        if (selected.attr('single_subfield')) {
            $(clause).find('.field_value').attr('maxlength', 1);
            $(clause).find('.field_value').val($(clause).find('.field_value').val().substring(0, 1));
        } else {
            $(clause).find('.field_value').attr('maxlength', '10000');
        }

        if (selected.attr('no_wildcard_field')) {
            var target = $(clause).find('.target_field');

            if (target.val().indexOf("*") >= 0) {
                target.val(target.val().replace("*", ""));
                $(clause).find('.no_wildcards_please').show();
            } else {
                $(clause).find('.no_wildcards_please:visible').hide();
            }
        }
    });

    var groups = $('.clause_group');

    groups.each(function(idx, group) {
        var checkbox = $('<input class="grouper_checkbox grouper_checkbox_style" type="checkbox" />');
        checkbox.click(function(checkbox) {
            update_buttons();
        });
        $(group).prepend(checkbox);
    });

    update_buttons();
    if (generate_query()) {
        $('#preview_query').fadeIn();
        $('#submit_button #submit').removeAttr('disabled');
    } else {
        $('#submit_button #submit').attr('disabled', 'disabled');
        $('#preview_query').fadeOut();
    }
}


function add_clause(elt, boolean_op) {
    var my_clause = $('.where_clause:last');

    var new_clause = my_clause.clone(true);

    reset_form(new_clause);

    insert_clause(new_clause, my_clause.parents('.clause_group'), boolean_op);
}


function insert_clause(elt, after_elt) {
    var boolean_op = arguments[2];
    var elt = $(elt);

    if (boolean_op) {
        elt.find('.boolean_label').empty();

        var options = $('.boolean_options:first').clone(true);
        options.val(boolean_op);
        options.show();
        elt.children('.boolean_label').append(options);
    }

    after_elt.after(elt);

    $(elt).wrap('<div class="clause_group clause_group_style" />');

    update_form();
}


function clause_to_obj(clause) {
    var value = false;
    var valueNode = $(clause).find('.field_value');
    if (!valueNode.attr('disabled')) {
        value = valueNode.val();
    }

    var subquery = {"operator" : $(clause).find('.operator').val(),
                "field" : $(clause).find('.target_field:first').val(),
                "value" : value};

    if (subquery['field']) {
        return subquery;
    } else {
        return false;
    }
}


function clause_boolean(clause) {
    var label = $(clause).find('.boolean_label:first > select');

    if (label.size() != 0) {
        return label.val();
    } else {
        return false;
    }
}


function generate_query() {
    var query = false;

    $('.clause_group').each(function(idx, clause_group) {
        var subquery = false;

        $(clause_group).find('.where_clause').each(function(idx, clause) {
            if (!subquery) {
                subquery = clause_to_obj(clause);
            } else {
                var newquery = clause_to_obj(clause);

                if (newquery) {
                    subquery = {"boolean" : clause_boolean(clause),
                                "left" : subquery,
                                "right" : newquery};
                }
            }
        });

        if (query) {
            if (subquery) {
                query = {"boolean" : $(clause_group).find('.boolean_label:first > select').val(),
                         "left" : query,
                         "right" : subquery};
            }
        } else {
            query = subquery;
        }

    });

    if (query) {
        var query_text = JSON.stringify(query, undefined, 4);
        $('#querydisplay').html('<pre>' + query_text + '</pre>');

        return query_text;
    } else {
        return false;
    }
}


function get_timestamp()
{
    return new Date().getTime();
}


function render_job(job)
{
    var table = $('<table class="query_summary" />');

    var row = $('<tr />');
    row.append('<th>Source:</th>')
    row.append('<td>' + job['source'] + '</td>')
    table.append(row)

    var row = $('<tr />');
    row.append('<th>Output:</th>')
    row.append('<td>' + job['destination'] + '</td>')
    table.append(row)

    var row = $('<tr />');
    row.append('<th>Clauses:</th>')
    row.append('<td class="job_query">' +  JSON.stringify(job['query'], undefined, 4).replace(new RegExp("\n", "g"), "<br>") + '</td>');
    table.append(row)

    return table;
}


var deleted_jobs_pending = false;

function poll_job_list()
{
    get_job_list(function () {
        setTimeout(poll_job_list, 2000);
    });
}


function delete_button_clicked(event)
{
    var job_id = $(event.target).data('job_id');

    deleted_jobs_pending = true;
    $(event.target).parents('tr.job:first').empty().remove();
    $.ajax({
        "type" : "POST",
        "url" : "delete_job",
        "data" : {"id" : job_id},
        "complete" : function(hr, status) {
            deleted_jobs_pending = false;
            get_job_list(); return false;
        }});
}


// Creating a new delete button for each entry for each refresh seems
// a little too heavyweight and eats a lot of memory.  Reuse them
// instead.  Muh.
var delete_buttons = [];

function delete_button_for(job_id)
{
    var delete_button = delete_buttons.pop();

    if (!delete_button) {
        // Need a new one.
        delete_button = $('<input class="delete_job" type="button" value="delete"/>');
        delete_button.click(delete_button_clicked);
    }

    delete_button = $(delete_button);

    delete_button.data('job_id', job_id);

    return delete_button;
}


function return_delete_button(delete_button)
{
    delete_buttons.push(delete_button);
}


var last_job_list_version = -1;

function get_job_list(callback)
{
    if (!callback) {
        callback = function () {};
    }

    if (deleted_jobs_pending) {
        // Wait for the delete to finish before refreshing again.
        callback();
        return;
    }

    $.ajax({
        "type" : "GET",
        "url" : "job_list",
        "data" : {timestamp : get_timestamp()},
        "complete" : function(jqxhr, status) {
            callback();
        },
        "success" : function(data) {
            if (deleted_jobs_pending) {
                // Wait for the delete to finish before refreshing again.
                return;
            }

            if (data['version'] == last_job_list_version) {
                // No change so there's nothing to do.
                return;
            }

            last_job_list_version = data['version'];
            var list = [];

            $(data['jobs']).each(function(idx, job) {
                var row = $('<tr class="job"></tr>');
                row.append($('<td class="query_column" />').append(render_job(job)));
                row.append('<td>' + 
                           (job['submission-time'] ? ('<h5>Submitted:</h5>' + job['submission-time']) : '') +
                           (job['start-time'] ? ('<h5>Started:</h5>' + job['start-time']) : '') +
                           (job['completion-time'] ? ('<h5>Finished:</h5>' + job['completion-time']) : '') +
                           '</td>');

                var status = '<div class="status">' + job['status'] + '</div>';

                if (job['records-checked'] != '0') {
                    status += ('<p><span class="counts">Hits: </span>' + job['hits'] + '</p>');
                    status += ('<p><span class="counts">Checked: </span>' + job['records-checked'] + '</p>');
                }

                if (job['file-available']) {
                    status += '<p class="get_output"><a href="job_output/' + job['id'] + '">Download output</a></p>';
                } else if (job['records-checked'] != '0') {
                    status += '<p class="get_output"><a href="job_output/' + job['id'] + '">Preview</a></p>';
                }

                row.append('<td class="job_status_column">' + status + '</td>');

                var delete_button = delete_button_for(job['id']);
                row.append(delete_button);
                $(delete_button).wrap('<td />');

                list.push(row);
            });

            // Replace the existing divs one by one to stop the
            // overall container height changing if possible.
            // Otherwise IE insists on scrolling randomly and jumping
            // around.
            var job_entries = $('.job');

            $(job_entries).find('.delete_job').each(function (idx, button) {
                // Re-use precious buttons
                $(button).detach();
                return_delete_button(button);
            });

            for (var i = 0; i < Math.max(job_entries.size(), list.length); i++) {
                if (i < list.length) {
                    if (job_entries.get(i)) {
                        $(list[i]).height($(job_entries.get(i)).height());
                        var zapped = job_entries.get(i);
                        $(zapped).replaceWith(list[i]);
                        $(zapped).empty().remove();
                    } else {
                        $('#job_list').append(list[i]);
                    }
                } else {
                    $(job_entries.get(i)).empty().remove();
                }
            }


            if ($('.job').size() > 0) {
                if (!$('.joblist').is(":visible")) {
                    $('.joblist').fadeIn();
                }
            } else {
                if ($('.joblist').is(":visible")) {
                    $('.joblist').fadeOut();
                }
            }

            return false;
        }
    });
}


function run_jobs()
{
    $.ajax({
        "type" : "POST",
        "url" : "run_jobs",
        "success" : function(data) {
            get_job_list();
            return false;
        }});
}


function extract_output_options()
{
    var options = {}
    $('.input_field:visible').each(function(idx, field) {
        options[$(field).attr('name')] = $(field).val();
    });

    return JSON.stringify(options);
}


function text_input(parent_elt, name, class_name, label, caption, help)
{
    parent_elt.append($('<div class="captioned_input ' + class_name + '_container">' +
                        (label ? '<label for="' + name + '">' + label + '</label>' : '')+
                        '<div style="display: inline-block">' +
                        '<input class="' + class_name + ' input_field" ' +
                        'type="text" name="' + name + '" />' + help +
                        '<div class="caption ' + class_name + '_caption">' + caption + '</div>' +
                        '</div>' +
                        '</div>'));
}


function render_field(field)
{
    var result = $('<div class="field_options"></div>');

    if (field['type'] == 'text') {
        text_input(result, field['name'], 'input_field', field['label'], field['caption'], '');
    }

    result.hide();

    return result;
}


function show_output_options(select)
{
    var option = $(select).find(':selected');
    var elt = option.data('options');

    $('.field_options').hide();

    if (elt) {
        elt.show();
    }
}


function get_output_options()
{
    $.ajax({
        "type" : "GET",
        "url" : "destination_options",
        "data" : {timestamp : get_timestamp()},
        "success" : function(data) {
            var output_selection = $('<select id="selected_output" class="selected_output_style"></select>');
            $('.output_options').append(output_selection);

            $(data).each(function(idx, option) {
                var option_elt = $('<option value="' + idx + '">' + option['description'] + '</option>');
                output_selection.append(option_elt);

                $(option['required-fields']).each(function(idx, field) {
                    var field_elt = render_field(field);
                    $('.output_options').append(field_elt);
                    option_elt.data('options', field_elt);
                });
            });

            output_selection.change(function(event) { show_output_options(event.target) });
            show_output_options(output_selection);

            return false;
        }
    });
}


function get_source_options()
{
    $.ajax({
        "type" : "GET",
        "url" : "source_options",
        "data" : {timestamp : get_timestamp()},
        "success" : function(data) {
            var source_selection = $('<select id="selected_source"></select>');
            $('.source_options').append(source_selection);

            $(data).each(function(idx, option) {
                var option_elt = $('<option value="' + idx + '">' + option['description'] + '</option>');
                source_selection.append(option_elt);
            });

            return false;
        }
    });
}


function help_link(name, title)
{
    return '<a class="help_button" title="' + title + '" id="help_' + name + '" href="#">?</a>'
}


function show_error(message, trace)
{
    console.log(message);

    $("#error_message_text").html(message);
    $("#error_trace_text").html(trace);

    $('#error_pane').dialog({width : 650, height: 650, modal: true});
}
